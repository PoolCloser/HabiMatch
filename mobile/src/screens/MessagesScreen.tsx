import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createGroupConversation,
  fetchInbox,
  fetchMutualMatches,
  openDirectConversation,
  type ConversationPreview,
  type GroupParticipant,
} from '../lib/messaging';

const PRIMARY = '#4A90D9';
const TEXT = '#111827';
const MUTED = '#6B7280';
const CARD = '#FFFFFF';

const PLACEHOLDER =
  'https://ui-avatars.com/api/?background=E5EAF4&color=4A90D9&size=128&rounded=true&bold=true';

export type ChatTarget = {
  conversationId: string;
  isGroup: boolean;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
};

type Props = {
  onOpenChat: (target: ChatTarget) => void;
};

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function participantName(participant: GroupParticipant): string {
  return participant.fullName?.trim() || `User ${participant.userId.slice(0, 8)}`;
}

function conversationSubtitle(preview: ConversationPreview): string {
  if (preview.isGroup) return `${preview.participantCount} participants`;
  return 'Mutual match';
}

export default function MessagesScreen({ onOpenChat }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<GroupParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

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

  const loadGroupParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    setError('');
    try {
      const matches = await fetchMutualMatches();
      setGroupParticipants(matches);
    } catch (e) {
      setGroupParticipants([]);
      setError(e instanceof Error ? e.message : 'Could not load mutual matches.');
    } finally {
      setLoadingParticipants(false);
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

  const toggleGroupCreator = () => {
    setShowGroupCreator(current => {
      const next = !current;
      if (next && groupParticipants.length === 0 && !loadingParticipants) {
        void loadGroupParticipants();
      }
      return next;
    });
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId],
    );
  };

  const openConversation = (conversationId: string, preview: ConversationPreview) => {
    onOpenChat({
      conversationId,
      isGroup: preview.isGroup,
      title: preview.title,
      subtitle: conversationSubtitle(preview),
      avatarUrl: preview.avatarUrl,
    });
  };

  const handleOpen = async (preview: ConversationPreview) => {
    const openingKey = preview.conversationId ?? preview.targetUserId;
    if (!openingKey || openingId) return;

    setOpeningId(openingKey);
    setError('');
    try {
      const conversationId = preview.conversationId
        ?? (preview.targetUserId
          ? await openDirectConversation(preview.targetUserId)
          : null);
      if (!conversationId) throw new Error('Could not open chat.');
      openConversation(conversationId, preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open chat.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedParticipantIds.length < 2 || creatingGroup) return;

    setCreatingGroup(true);
    setError('');
    try {
      const conversationId = await createGroupConversation(selectedParticipantIds, groupName);
      const title = groupName.trim()
        || selectedParticipantIds
          .map(id => groupParticipants.find(participant => participant.userId === id))
          .filter((participant): participant is GroupParticipant => Boolean(participant))
          .map(participantName)
          .join(', ')
        || 'Group chat';

      setShowGroupCreator(false);
      setGroupName('');
      setSelectedParticipantIds([]);
      await loadInbox();
      onOpenChat({
        conversationId,
        isGroup: true,
        title,
        subtitle: `${selectedParticipantIds.length + 1} participants`,
        avatarUrl: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group chat.');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>HM</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Chat with mutual matches only.</Text>
        </View>
        <TouchableOpacity style={styles.newGroupBtn} onPress={toggleGroupCreator}>
          <Ionicons name="people-outline" size={17} color={CARD} />
          <Text style={styles.newGroupText}>New group</Text>
        </TouchableOpacity>
      </View>

      {showGroupCreator ? (
        <View style={styles.groupPanel}>
          <Text style={styles.groupTitle}>Create group</Text>
          <TextInput
            style={styles.groupInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor="#9CA3AF"
            maxLength={60}
          />

          {loadingParticipants ? (
            <ActivityIndicator color={PRIMARY} />
          ) : (
            <View style={styles.participantList}>
              {groupParticipants.map(participant => {
                const selected = selectedParticipantIds.includes(participant.userId);
                const name = participantName(participant);
                const avatarUri =
                  participant.avatarUrl?.trim()
                  || `${PLACEHOLDER}&name=${encodeURIComponent(name)}`;

                return (
                  <TouchableOpacity
                    key={participant.userId}
                    style={[styles.participantRow, selected && styles.participantRowSelected]}
                    onPress={() => toggleParticipant(participant.userId)}
                  >
                    <Image source={{ uri: avatarUri }} style={styles.participantAvatar} />
                    <Text style={styles.participantName}>{name}</Text>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={selected ? PRIMARY : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
              {groupParticipants.length === 0 ? (
                <Text style={styles.groupHint}>Mutual matches will appear here.</Text>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.createGroupBtn,
              (selectedParticipantIds.length < 2 || creatingGroup) && styles.createGroupBtnDisabled,
            ]}
            onPress={() => void handleCreateGroup()}
            disabled={selectedParticipantIds.length < 2 || creatingGroup}
          >
            {creatingGroup ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createGroupText}>
                Create group
                {selectedParticipantIds.length > 0 ? ` (${selectedParticipantIds.length + 1})` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.conversationId ?? item.targetUserId ?? item.title}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} />
          }
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="home-outline" size={40} color={PRIMARY} />
              <Text style={styles.emptyTitle}>No mutual matches yet</Text>
              <Text style={styles.emptyBody}>
                When you and someone both tap the check on the feed, they will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const avatarUri =
              item.avatarUrl?.trim()
              || `${PLACEHOLDER}&name=${encodeURIComponent(item.title)}`;
            const openingKey = item.conversationId ?? item.targetUserId;
            const busy = openingKey ? openingId === openingKey : false;

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => void handleOpen(item)}
                disabled={Boolean(openingId)}
              >
                {item.isGroup ? (
                  <View style={styles.groupAvatar}>
                    <Ionicons name="people" size={24} color={PRIMARY} />
                  </View>
                ) : (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{item.title}</Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.hasStartedChat
                      ? item.lastMessageBody ?? 'No messages yet'
                      : 'New match - tap to say hi'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  logo: { color: TEXT, fontSize: 18, fontWeight: '800' },
  title: { color: TEXT, fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { color: MUTED, fontSize: 14, marginTop: 4 },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 2,
  },
  newGroupText: { color: CARD, fontSize: 13, fontWeight: '700' },
  groupPanel: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  groupTitle: { color: TEXT, fontSize: 16, fontWeight: '700' },
  groupInput: {
    borderWidth: 1,
    borderColor: '#D8E6F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 14,
    backgroundColor: '#FAFBFC',
  },
  participantList: { gap: 8 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    borderRadius: 12,
    padding: 9,
  },
  participantRowSelected: { borderColor: PRIMARY, backgroundColor: '#F0F7FF' },
  participantAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee' },
  participantName: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '600' },
  groupHint: { color: MUTED, fontSize: 13, lineHeight: 19 },
  createGroupBtn: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  createGroupBtnDisabled: { opacity: 0.5 },
  createGroupText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowName: { color: TEXT, fontSize: 16, fontWeight: '700' },
  rowPreview: { color: MUTED, fontSize: 14, marginTop: 3 },
  rowMeta: { alignItems: 'flex-end', minWidth: 48 },
  rowTime: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
});
