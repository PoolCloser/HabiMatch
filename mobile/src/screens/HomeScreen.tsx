import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  loadDiscoverFeed,
  saveDiscoveryDecision,
  type RankedMatch,
} from '../lib/matchRanking';
import MatchFeedCard from '../components/MatchFeedCard';
import SwipeableDiscoverCard from '../components/SwipeableDiscoverCard';

const PRIMARY = '#4A90D9';
const PASS_BG = '#FFF0F0';
const PASS_BORDER = '#E57373';
const LIKE_BG = '#E8F5E9';
const LIKE_BORDER = '#66BB6A';

export default function HomeScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [userId, setUserId] = useState('');
  const [feed, setFeed] = useState<RankedMatch[]>([]);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const [incompleteSkipped, setIncompleteSkipped] = useState(0);
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const current = feed[0] ?? null;

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    setBannerError('');
    const result = await loadDiscoverFeed(supabase);
    if (result.error) {
      setUserId('');
      setFeed([]);
      setNeedsQuestionnaire(false);
      setBannerError(result.error);
    } else {
      setUserId(result.userId);
      setFeed(result.feed);
      setNeedsQuestionnaire(result.needsQuestionnaire);
      setIncompleteSkipped(result.incompleteSkipped);
      setFilteredOutCount(result.filteredOutCount);
      if (result.needsQuestionnaire) {
        setBannerError('Complete your profile and questionnaire to see compatible roommates.');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  const handleSignOut = async () => {
    setAuthError('');
    setSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setAuthError(signOutError.message);
    } finally {
      setSigningOut(false);
    }
  };

  const advanceAfterDecision = useCallback(
    async (decision: 'pass' | 'like') => {
      if (!current || !userId || decisionBusy) return;
      setDecisionBusy(true);
      setBannerError('');
      try {
        const { ok, errorMessage } = await saveDiscoveryDecision(
          supabase,
          userId,
          current.userId,
          decision,
        );
        if (!ok && errorMessage) {
          setBannerError(errorMessage);
        }
        setFeed(prev => prev.slice(1));
      } finally {
        setDecisionBusy(false);
      }
    },
    [current, userId, decisionBusy],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>
            {
              'Everyone on the app shows up (sparse data). Swipe right = interested, left = pass — or use the buttons. Best-scoring profiles first.'
            }
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => void refreshFeed()}
            disabled={loading}
            accessibilityLabel="Refresh list"
          >
            <Ionicons name="refresh" size={22} color={loading ? '#ccc' : PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityLabel="Sign out"
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Ionicons name="log-out-outline" size={22} color="#555" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {bannerError ? (
        <Text style={styles.errorBanner}>{bannerError}</Text>
      ) : null}
      {authError ? <Text style={styles.authError}>{authError}</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading people from Supabase…</Text>
        </View>
      ) : needsQuestionnaire ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="clipboard-outline" size={48} color={PRIMARY} />
          <Text style={styles.emptyTitle}>Finish onboarding first</Text>
          <Text style={styles.emptyBody}>
            Your discover feed uses the same data as the matching algorithm. Complete the questionnaire
            to see ranked roommates here.
          </Text>
        </View>
      ) : current ? (
        <View style={styles.feedColumn}>
          <SwipeableDiscoverCard
            key={current.userId}
            cardKey={current.userId}
            disabled={decisionBusy}
            onPass={() => void advanceAfterDecision('pass')}
            onLike={() => void advanceAfterDecision('like')}
            style={styles.swipeArea}
          >
            <MatchFeedCard match={current} />
          </SwipeableDiscoverCard>
          <Text style={styles.actionHint}>Swipe the card or use ✕ / ✓ below.</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionCircle, styles.passCircle]}
              onPress={() => void advanceAfterDecision('pass')}
              disabled={decisionBusy}
              accessibilityLabel="Pass"
              accessibilityRole="button"
            >
              {decisionBusy ? (
                <ActivityIndicator color={PASS_BORDER} />
              ) : (
                <Ionicons name="close" size={40} color={PASS_BORDER} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCircle, styles.likeCircle]}
              onPress={() => void advanceAfterDecision('like')}
              disabled={decisionBusy}
              accessibilityLabel="Interested"
              accessibilityRole="button"
            >
              {decisionBusy ? (
                <ActivityIndicator color={LIKE_BORDER} />
              ) : (
                <Ionicons name="checkmark" size={40} color={LIKE_BORDER} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={48} color={PRIMARY} />
          <Text style={styles.emptyTitle}>No more profiles right now</Text>
          <Text style={styles.emptyBody}>
            {filteredOutCount > 0
              ? `${filteredOutCount} people had dealbreaker mismatches with you (they still appeared in your feed). `
              : ''}
            {incompleteSkipped > 0
              ? `${incompleteSkipped} profile(s) skipped (no age on file). `
              : ''}
            Pull refresh when new people join.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => void refreshFeed()}>
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 52,
    paddingHorizontal: 20,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    maxWidth: 280,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  errorBanner: {
    color: '#B42318',
    backgroundColor: '#FEEDEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  authError: {
    color: '#B42318',
    marginBottom: 8,
    fontSize: 13,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  feedColumn: {
    flex: 1,
    paddingBottom: 8,
  },
  swipeArea: {
    flex: 1,
    minHeight: 200,
  },
  actionHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
    marginTop: 8,
    paddingBottom: 24,
  },
  actionCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  passCircle: {
    backgroundColor: PASS_BG,
    borderColor: PASS_BORDER,
  },
  likeCircle: {
    backgroundColor: LIKE_BG,
    borderColor: LIKE_BORDER,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});
