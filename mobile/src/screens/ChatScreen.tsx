import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from '../lib/messaging';

const PRIMARY = '#4A90D9';
const TEXT = '#111827';
const MUTED = '#6B7280';
const CARD = '#FFFFFF';

const PLACEHOLDER =
  'https://ui-avatars.com/api/?background=E5EAF4&color=4A90D9&size=128&rounded=true&bold=true';

type Props = {
  conversationId: string;
  otherUserId: string;
  otherFullName: string | null;
  otherAvatarUrl: string | null;
  onBack: () => void;
};

function displayName(fullName: string | null, userId: string): string {
  return fullName?.trim() || `User ${userId.slice(0, 8)}`;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ChatScreen({
  conversationId,
  otherUserId,
  otherFullName,
  otherAvatarUrl,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const title = displayName(otherFullName, otherUserId);
  const avatarUri =
    otherAvatarUrl?.trim() || `${PLACEHOLDER}&name=${encodeURIComponent(title)}`;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadMessages = useCallback(async () => {
    setError('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      setMyUserId(authData.user?.id ?? null);
      const rows = await fetchMessages(conversationId);
      setMessages(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    channelRef.current = subscribeToMessages(conversationId, message => {
      setMessages(current => {
        if (current.some(row => row.id === message.id)) return current;
        return [...current, message];
      });
      scrollToEnd();
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, scrollToEnd]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToEnd();
    }
  }, [loading, messages.length, scrollToEnd]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await sendMessage(conversationId, text);
      setDraft('');
      const rows = await fetchMessages(conversationId);
      setMessages(rows);
      scrollToEnd();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{title}</Text>
          <Text style={styles.headerMeta}>Mutual match</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const mine = item.senderId === myUserId;
            return (
              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {formatMessageTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => void handleSend()}
          disabled={!draft.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EAF2',
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  headerText: { flex: 1 },
  headerName: { color: TEXT, fontSize: 17, fontWeight: '700' },
  headerMeta: { color: MUTED, fontSize: 13, marginTop: 2 },
  error: {
    color: '#B42318',
    backgroundColor: '#FEEDEB',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: TEXT, fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { color: MUTED, fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.85)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: '#E4EAF2',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#D8E6F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT,
    backgroundColor: '#FAFBFC',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
