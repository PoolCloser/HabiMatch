export type MutualMatch = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  matchedAt: string;
};

export type GroupParticipant = MutualMatch;

export type ConversationPreview = {
  conversationId: string | null;
  isGroup: boolean;
  targetUserId: string | null;
  title: string;
  avatarUrl: string | null;
  participantCount: number;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  hasStartedChat: boolean;
};

export type ConversationRow = {
  conversation_id: string;
  is_group: boolean;
  target_user_id: string | null;
  title: string | null;
  avatar_url: string | null;
  participant_count: number | null;
  last_message_body: string | null;
  last_message_at: string | null;
};

function fallbackUserTitle(userId: string): string {
  return `User ${userId.slice(0, 8)}`;
}

export function buildInboxPreviews(
  matches: MutualMatch[],
  conversations: ConversationRow[],
): ConversationPreview[] {
  const directConversationByUser = new Map(
    conversations
      .filter(row => !row.is_group && row.target_user_id)
      .map(row => [row.target_user_id as string, row]),
  );

  const previews: ConversationPreview[] = conversations
    .filter(row => row.is_group)
    .map(row => ({
      conversationId: row.conversation_id,
      isGroup: true,
      targetUserId: null,
      title: row.title?.trim() || 'Group chat',
      avatarUrl: null,
      participantCount: row.participant_count ?? 0,
      lastMessageBody: row.last_message_body,
      lastMessageAt: row.last_message_at,
      hasStartedChat: true,
    }));

  previews.push(
    ...matches.map(match => {
      const existing = directConversationByUser.get(match.userId);
      if (existing) {
        return {
          conversationId: existing.conversation_id,
          isGroup: false,
          targetUserId: match.userId,
          title: existing.title?.trim() || match.fullName?.trim() || fallbackUserTitle(match.userId),
          avatarUrl: existing.avatar_url ?? match.avatarUrl,
          participantCount: existing.participant_count ?? 2,
          lastMessageBody: existing.last_message_body,
          lastMessageAt: existing.last_message_at,
          hasStartedChat: true,
        };
      }

      return {
        conversationId: null,
        isGroup: false,
        targetUserId: match.userId,
        title: match.fullName?.trim() || fallbackUserTitle(match.userId),
        avatarUrl: match.avatarUrl,
        participantCount: 2,
        lastMessageBody: null,
        lastMessageAt: match.matchedAt,
        hasStartedChat: false,
      };
    }),
  );

  previews.sort((left, right) => {
    const leftTime = new Date(left.lastMessageAt ?? 0).getTime();
    const rightTime = new Date(right.lastMessageAt ?? 0).getTime();
    return rightTime - leftTime;
  });

  return previews;
}
