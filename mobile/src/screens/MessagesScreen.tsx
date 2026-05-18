import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchInbox,
  openDirectConversation,
  type ConversationPreview,
} from '../lib/messaging';

const PRIMARY = '#4A90D9';
const TEXT = '#111827';
const MUTED = '#6B7280';
const CARD = '#FFFFFF';

const PLACEHOLDER =
  'https://ui-avatars.com/api/?background=E5EAF4&color=4A90D9&size=128&rounded=true&bold=true';

export type ChatTarget = {
  conversationId: string;
  otherUserId: string;
  otherFullName: string | null;
  otherAvatarUrl: string | null;
};

type Props = {
  onOpenChat: (target: ChatTarget) => void;
};

function displayName(preview: ConversationPreview): string {
  return preview.otherFullName?.trim() || `User ${preview.otherUserId.slice(0, 8)}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagesScreen({ onOpenChat }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    setError('');
    try {
      const inbox = await fetchInbox();
      setItems(inbox);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : 'Could not load messages.');
    }
  }, []);

  const refresh = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    await loadInbox();
    setLoading(false);
    setRefreshing(false);
  }, [loadInbox]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpen = async (preview: ConversationPreview) => {
    if (openingUserId) return;
    setOpeningUserId(preview.otherUserId);
    setError('');
    try {
      const conversationId =
        preview.conversationId ?? (await openDirectConversation(preview.otherUserId));
      onOpenChat({
        conversationId,
        otherUserId: preview.otherUserId,
        otherFullName: preview.otherFullName,
        otherAvatarUrl: preview.otherAvatarUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open chat.');
    } finally {
      setOpeningUserId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>HM</Text>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Chat with mutual matches only.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.otherUserId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} />
          }
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="heart-outline" size={40} color={PRIMARY} />
              <Text style={styles.emptyTitle}>No mutual matches yet</Text>
              <Text style={styles.emptyBody}>
                When you and someone both tap the check on the feed, they will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = displayName(item);
            const avatarUri =
              item.otherAvatarUrl?.trim()
              || `${PLACEHOLDER}&name=${encodeURIComponent(name)}`;
            const busy = openingUserId === item.otherUserId;

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => void handleOpen(item)}
                disabled={Boolean(openingUserId)}
              >
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{name}</Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.hasStartedChat
                      ? item.lastMessageBody ?? 'No messages yet'
                      : 'New match — tap to say hi'}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  {item.lastMessageAt ? (
                    <Text style={styles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
                  ) : null}
                  {busy ? <ActivityIndicator size="small" color={PRIMARY} /> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  header: { marginBottom: 12 },
  logo: { color: TEXT, fontSize: 18, fontWeight: '800' },
  title: { color: TEXT, fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { color: MUTED, fontSize: 14, marginTop: 4 },
  error: {
    color: '#B42318',
    backgroundColor: '#FEEDEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#eee' },
  rowBody: { flex: 1 },
  rowName: { color: TEXT, fontSize: 16, fontWeight: '700' },
  rowPreview: { color: MUTED, fontSize: 14, marginTop: 3 },
  rowMeta: { alignItems: 'flex-end', minWidth: 48 },
  rowTime: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
});
