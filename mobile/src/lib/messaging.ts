import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  buildInboxPreviews,
  type ConversationRow,
  type MutualMatch as PreviewMutualMatch,
} from './messagingPreview';

export type MutualMatch = PreviewMutualMatch;

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

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type MutualMatchRow = {
  matched_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  matched_at: string;
};

export async function fetchMutualMatches(): Promise<MutualMatch[]> {
  const { data, error } = await supabase.rpc('list_my_mutual_matches');
  if (error) throw error;

  return ((data ?? []) as MutualMatchRow[]).map(row => ({
    userId: row.matched_user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    matchedAt: row.matched_at,
  }));
}

export async function fetchConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase.rpc('list_my_conversations');
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function fetchInbox(): Promise<ConversationPreview[]> {
  const [matches, conversations] = await Promise.all([
    fetchMutualMatches(),
    fetchConversations(),
  ]);

  return buildInboxPreviews(matches, conversations);
}

export async function openDirectConversation(targetUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    other_user_id: targetUserId,
  });
  if (error) throw error;
  if (!data) throw new Error('Could not open conversation.');
  return data as string;
}

export async function createGroupConversation(
  participantUserIds: string[],
  groupName?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    participant_user_ids: participantUserIds,
    group_name: groupName?.trim() || null,
  });
  if (error) throw error;
  if (!data) throw new Error('Could not create group chat.');
  return data as string;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = authData.user?.id;
  if (!userId) throw new Error('No signed-in user found.');

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: trimmed,
  });
  if (error) throw error;
}

export async function checkMutualMatch(otherUserId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_mutual_match', {
    other_user_id: otherUserId,
  });
  if (error) throw error;
  return Boolean(data);
}

export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: ChatMessage) => void,
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      payload => {
        const row = payload.new as {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        onInsert({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
        });
      },
    )
    .subscribe();
}
