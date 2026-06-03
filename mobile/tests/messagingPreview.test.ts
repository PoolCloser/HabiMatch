import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildInboxPreviews,
  type ConversationRow,
  type MutualMatch,
} from '../src/lib/messagingPreview';

const match = (overrides: Partial<MutualMatch>): MutualMatch => ({
  userId: 'user-12345678',
  fullName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  matchedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
});

const conversation = (overrides: Partial<ConversationRow>): ConversationRow => ({
  conversation_id: 'conversation-1',
  is_group: false,
  target_user_id: 'user-12345678',
  title: 'Test User',
  avatar_url: null,
  participant_count: 2,
  last_message_body: null,
  last_message_at: null,
  ...overrides,
});

describe('buildInboxPreviews', () => {
  test('merges groups, started direct chats, and new mutual matches newest first', () => {
    const previews = buildInboxPreviews(
      [
        match({
          userId: 'alice-12345678',
          fullName: ' Alice ',
          avatarUrl: 'https://example.com/alice-match.jpg',
          matchedAt: '2026-05-03T10:00:00.000Z',
        }),
        match({
          userId: 'bob-12345678',
          fullName: 'Bob',
          avatarUrl: null,
          matchedAt: '2026-05-04T10:00:00.000Z',
        }),
      ],
      [
        conversation({
          conversation_id: 'group-1',
          is_group: true,
          target_user_id: null,
          title: 'House search',
          participant_count: 4,
          last_message_body: 'Tour at 2?',
          last_message_at: '2026-05-02T10:00:00.000Z',
        }),
        conversation({
          conversation_id: 'direct-alice',
          target_user_id: 'alice-12345678',
          title: ' ',
          avatar_url: null,
          participant_count: null,
          last_message_body: 'Hi Alice',
          last_message_at: '2026-05-05T10:00:00.000Z',
        }),
        conversation({
          conversation_id: 'direct-stranger',
          target_user_id: 'stranger-12345678',
          title: 'Not a mutual match',
          last_message_at: '2026-05-06T10:00:00.000Z',
        }),
      ],
    );

    assert.deepEqual(
      previews.map(preview => preview.conversationId ?? preview.targetUserId),
      ['direct-alice', 'bob-12345678', 'group-1'],
    );
    assert.deepEqual(previews[0], {
      conversationId: 'direct-alice',
      isGroup: false,
      targetUserId: 'alice-12345678',
      title: 'Alice',
      avatarUrl: 'https://example.com/alice-match.jpg',
      participantCount: 2,
      lastMessageBody: 'Hi Alice',
      lastMessageAt: '2026-05-05T10:00:00.000Z',
      hasStartedChat: true,
    });
    assert.deepEqual(previews[1], {
      conversationId: null,
      isGroup: false,
      targetUserId: 'bob-12345678',
      title: 'Bob',
      avatarUrl: null,
      participantCount: 2,
      lastMessageBody: null,
      lastMessageAt: '2026-05-04T10:00:00.000Z',
      hasStartedChat: false,
    });
  });

  test('uses stable fallback titles and counts when source data is sparse', () => {
    const previews = buildInboxPreviews(
      [
        match({
          userId: 'fallback-user-abcdef',
          fullName: ' ',
          avatarUrl: null,
          matchedAt: '2026-05-01T10:00:00.000Z',
        }),
      ],
      [
        conversation({
          conversation_id: 'group-empty',
          is_group: true,
          target_user_id: null,
          title: ' ',
          participant_count: null,
          last_message_at: null,
        }),
      ],
    );

    assert.deepEqual(
      previews.map(preview => ({
        title: preview.title,
        participantCount: preview.participantCount,
        hasStartedChat: preview.hasStartedChat,
      })),
      [
        {
          title: 'User fallback',
          participantCount: 2,
          hasStartedChat: false,
        },
        {
          title: 'Group chat',
          participantCount: 0,
          hasStartedChat: true,
        },
      ],
    );
  });
});
