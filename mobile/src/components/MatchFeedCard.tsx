import { View, Text, StyleSheet, Image } from 'react-native';
import type { DomainKey } from '../lib/matching';
import type { RankedMatch } from '../lib/matchRanking';

const PRIMARY = '#4A90D9';

const DOMAIN_LABELS: Record<DomainKey, string> = {
  logistics: 'Logistics',
  sleep: 'Sleep',
  cleanliness: 'Clean',
  noise: 'Noise',
  guests: 'Guests',
  cohabitation: 'Habits',
  conflict: 'Conflict',
};

const PLACEHOLDER =
  'https://ui-avatars.com/api/?background=E5EAF4&color=4A90D9&size=400&rounded=true&bold=true';

type Props = {
  match: RankedMatch;
};

function formatPercent(value: number): number {
  return Math.round(value * 100);
}

function topDomainSummary(domains: Record<DomainKey, number>): string {
  return Object.entries(domains)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2)
    .map(([domain, value]) => `${DOMAIN_LABELS[domain as DomainKey]} ${formatPercent(value)}%`)
    .join(' · ');
}

function displayName(match: RankedMatch): string {
  const trimmed = match.fullName?.trim();
  if (trimmed) return trimmed;
  return `Roommate ${match.userId.slice(0, 8)}`;
}

export default function MatchFeedCard({ match }: Props) {
  const uri =
    match.avatarUrl?.trim()
    || `${PLACEHOLDER}&name=${encodeURIComponent(displayName(match))}`;

  const showScore = !match.incompleteData;
  const showDomains = showScore && match.passedFilters;
  const failLine = match.failures[0] ?? '';

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Image source={{ uri }} style={styles.avatar} accessibilityIgnoresInvertColors />
      <Text style={styles.name}>{displayName(match)}</Text>
      <Text style={styles.meta}>
        {[formatGender(match.gender), `${match.age} yrs`, match.location?.trim() || null]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {match.incompleteData ? (
        <View style={[styles.banner, styles.bannerMuted]}>
          <Text style={styles.bannerTitle}>Limited info</Text>
          <Text style={styles.bannerBody}>{failLine}</Text>
        </View>
      ) : !match.passedFilters ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerTitle}>Dealbreaker mismatch</Text>
          <Text style={styles.bannerBody}>{failLine}</Text>
        </View>
      ) : null}

      {showScore ? (
        <View
          style={[
            styles.scoreRow,
            !match.passedFilters && styles.scoreRowMuted,
          ]}
        >
          <Text style={styles.scoreLabel}>Compatibility</Text>
          <Text style={[styles.scoreValue, !match.passedFilters && styles.scoreValueMuted]}>
            {match.passedFilters ? `${formatPercent(match.score)}%` : '—'}
          </Text>
        </View>
      ) : null}

      {showDomains ? (
        <Text style={styles.hint}>{topDomainSummary(match.domains)}</Text>
      ) : showScore && !match.passedFilters ? (
        <Text style={styles.hintMuted}>You can still pass or show interest — sparse listings show everyone.</Text>
      ) : null}

      {match.bio?.trim() ? <Text style={styles.bio}>{match.bio.trim()}</Text> : null}
    </View>
  );
}

function formatGender(gender: 'man' | 'woman' | null): string | null {
  if (gender === 'man') return 'Man';
  if (gender === 'woman') return 'Woman';
  return null;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E7EDF5',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FCFDFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 220,
    borderRadius: 16,
    backgroundColor: '#eee',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  meta: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 14,
  },
  banner: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bannerMuted: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 4,
    borderLeftColor: '#9CA3AF',
  },
  bannerWarn: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#EA580C',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  scoreRowMuted: {
    backgroundColor: '#F3F4F6',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY,
  },
  scoreValueMuted: {
    color: '#6B7280',
  },
  hint: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  hintMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  bio: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});
