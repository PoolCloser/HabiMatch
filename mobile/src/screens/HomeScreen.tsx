import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
  calculateCompatibility,
  type DomainKey,
  type Gender,
  type MatchParticipant,
  type MatchPreferences,
} from '../lib/matching';

type ProfileRecord = {
  id: string;
  birthdate: string | null;
  gender: string | null;
  questionnaire_complete: boolean | null;
};

type PreferenceRecord = {
  user_id: string;
  smokes: boolean | null;
  ok_with_smoking: boolean | null;
  uses_marijuana: boolean | null;
  ok_with_marijuana: boolean | null;
  drinks_alcohol: boolean | null;
  ok_with_alcohol: boolean | null;
  has_pets: boolean | null;
  ok_with_pets: boolean | null;
  partner_stays_over: boolean | null;
  ok_with_partners_staying: boolean | null;
  shares_food: boolean | null;
  ok_with_coed: boolean | null;
  study_or_wfh: boolean | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  budget_min: number | null;
  budget_max: number | null;
  move_in_date: string | null;
  sleep_behavior_score: number | null;
  sleep_tolerance_score: number | null;
  clean_behavior_score: number | null;
  clean_tolerance_score: number | null;
  cooking_behavior_score: number | null;
  cooking_tolerance_score: number | null;
  noise_behavior_score: number | null;
  noise_tolerance_score: number | null;
  guest_behavior_score: number | null;
  guest_tolerance_score: number | null;
  conflict_behavior_score: number | null;
  conflict_tolerance_score: number | null;
  cohabitation_tolerance_score: number | null;
};

type RankedMatch = {
  userId: string;
  age: number;
  gender: Gender;
  score: number;
  passedFilters: boolean;
  failures: string[];
  domains: Record<DomainKey, number>;
};

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

const PREFERENCE_COLUMNS = [
  'user_id',
  'smokes',
  'ok_with_smoking',
  'uses_marijuana',
  'ok_with_marijuana',
  'drinks_alcohol',
  'ok_with_alcohol',
  'has_pets',
  'ok_with_pets',
  'partner_stays_over',
  'ok_with_partners_staying',
  'shares_food',
  'ok_with_coed',
  'study_or_wfh',
  'preferred_age_min',
  'preferred_age_max',
  'budget_min',
  'budget_max',
  'move_in_date',
  'sleep_behavior_score',
  'sleep_tolerance_score',
  'clean_behavior_score',
  'clean_tolerance_score',
  'cooking_behavior_score',
  'cooking_tolerance_score',
  'noise_behavior_score',
  'noise_tolerance_score',
  'guest_behavior_score',
  'guest_tolerance_score',
  'conflict_behavior_score',
  'conflict_tolerance_score',
  'cohabitation_tolerance_score',
].join(',');

const MATCH_LIMIT = 8;

export default function HomeScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [authError, setAuthError] = useState('');
  const [rankingError, setRankingError] = useState('');
  const [matches, setMatches] = useState<RankedMatch[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  const loadRankings = async () => {
    setLoadingMatches(true);
    setRankingError('');

    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No signed-in user found.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,birthdate,gender,questionnaire_complete')
        .eq('questionnaire_complete', true);
      if (profileError) throw profileError;

      const { data: preferenceData, error: preferenceError } = await supabase
        .from('lifestyle_preferences')
        .select(PREFERENCE_COLUMNS);
      if (preferenceError) throw preferenceError;

      const profiles = (profileData ?? []) as ProfileRecord[];
      const preferences = (preferenceData ?? []) as unknown as PreferenceRecord[];
      const preferencesByUser = new Map(preferences.map(row => [row.user_id, row]));
      const currentProfile = profiles.find(profile => profile.id === userId) ?? null;
      const currentPreferences = preferencesByUser.get(userId) ?? null;
      const currentParticipant = toParticipant(currentProfile, currentPreferences);

      if (!currentParticipant) {
        setMatches([]);
        setSkippedCount(0);
        setRankingError('Complete your profile and questionnaire before matching.');
        return;
      }

      let skipped = 0;
      const ranked = profiles
        .filter(profile => profile.id !== userId)
        .map(profile => {
          const candidate = toParticipant(profile, preferencesByUser.get(profile.id) ?? null);
          if (!candidate) {
            skipped += 1;
            return null;
          }

          const result = calculateCompatibility(currentParticipant, candidate);
          return {
            userId: candidate.userId,
            age: candidate.age,
            gender: candidate.gender,
            score: result.overallScore,
            passedFilters: result.passedFilters,
            failures: result.failures,
            domains: result.domains,
          };
        })
        .filter((match): match is RankedMatch => match !== null)
        .sort((left, right) => {
          if (left.passedFilters !== right.passedFilters) {
            return left.passedFilters ? -1 : 1;
          }
          return right.score - left.score;
        })
        .slice(0, MATCH_LIMIT);

      setMatches(ranked);
      setSkippedCount(skipped);
    } catch (error) {
      setMatches([]);
      setSkippedCount(0);
      setRankingError(error instanceof Error ? error.message : 'Could not load compatibility rankings.');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    void loadRankings();
  }, []);

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

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{"You're signed in"}</Text>
        <Text style={styles.subtitle}>Compatibility ranking for the current questionnaire.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.sectionLabel}>Roommate matches</Text>
            <Text style={styles.panelSubtitle}>
              {matches.length > 0
                ? `${matches.length} ranked ${skippedCount > 0 ? `(${skippedCount} incomplete skipped)` : ''}`
                : 'No ranked matches yet'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRankings} disabled={loadingMatches}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {rankingError ? <Text style={styles.errorBanner}>{rankingError}</Text> : null}

        {loadingMatches ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Scoring matches...</Text>
          </View>
        ) : (
          <View style={styles.matchList}>
            {matches.length === 0 && !rankingError ? (
              <Text style={styles.emptyText}>
                No completed roommate profiles are visible yet.
              </Text>
            ) : null}

            {matches.map((match, index) => (
              <View key={match.userId} style={styles.matchCard}>
                <View style={styles.matchTopRow}>
                  <View>
                    <Text style={styles.matchName}>
                      #{index + 1} User {shortUserId(match.userId)}
                    </Text>
                    <Text style={styles.matchMeta}>
                      {formatGender(match.gender)} - {match.age} years old
                    </Text>
                  </View>
                  <View style={[styles.scorePill, !match.passedFilters && styles.filteredPill]}>
                    <Text style={[styles.scoreText, !match.passedFilters && styles.filteredText]}>
                      {match.passedFilters ? `${formatPercent(match.score)}%` : 'Filtered'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.matchDetail}>
                  {match.passedFilters
                    ? topDomainSummary(match.domains)
                    : match.failures[0] ?? 'Failed a dealbreaker filter.'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {authError ? <Text style={styles.authError}>{authError}</Text> : null}

      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.btnDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.signOutText}>Sign out</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function toParticipant(
  profile: ProfileRecord | null,
  preferences: PreferenceRecord | null,
): MatchParticipant | null {
  if (!profile || !preferences) return null;

  const age = calculateAge(profile.birthdate);
  const matchPreferences = toMatchPreferences(preferences);
  if (!age || !matchPreferences) return null;

  return {
    userId: profile.id,
    age,
    gender: normalizeGender(profile.gender),
    preferences: matchPreferences,
  };
}

function toMatchPreferences(row: PreferenceRecord): MatchPreferences | null {
  const preferredAgeMin = requiredNumber(row.preferred_age_min);
  const preferredAgeMax = requiredNumber(row.preferred_age_max);
  const budgetMin = requiredNumber(row.budget_min);
  const budgetMax = requiredNumber(row.budget_max);
  const sleepBehaviorScore = requiredScore(row.sleep_behavior_score);
  const sleepToleranceScore = requiredScore(row.sleep_tolerance_score);
  const cleanBehaviorScore = requiredScore(row.clean_behavior_score);
  const cleanToleranceScore = requiredScore(row.clean_tolerance_score);
  const cookingBehaviorScore = requiredScore(row.cooking_behavior_score);
  const cookingToleranceScore = requiredScore(row.cooking_tolerance_score ?? row.cooking_behavior_score);
  const noiseBehaviorScore = requiredScore(row.noise_behavior_score);
  const noiseToleranceScore = requiredScore(row.noise_tolerance_score);
  const guestBehaviorScore = requiredScore(row.guest_behavior_score);
  const guestToleranceScore = requiredScore(row.guest_tolerance_score);
  const conflictBehaviorScore = requiredScore(row.conflict_behavior_score);
  const conflictToleranceScore = requiredScore(row.conflict_tolerance_score);
  const cohabitationToleranceScore = requiredScore(row.cohabitation_tolerance_score);

  if (
    preferredAgeMin === null
    || preferredAgeMax === null
    || budgetMin === null
    || budgetMax === null
    || !isIsoDate(row.move_in_date)
    || preferredAgeMax < preferredAgeMin
    || budgetMax < budgetMin
    || sleepBehaviorScore === null
    || sleepToleranceScore === null
    || cleanBehaviorScore === null
    || cleanToleranceScore === null
    || cookingBehaviorScore === null
    || cookingToleranceScore === null
    || noiseBehaviorScore === null
    || noiseToleranceScore === null
    || guestBehaviorScore === null
    || guestToleranceScore === null
    || conflictBehaviorScore === null
    || conflictToleranceScore === null
    || cohabitationToleranceScore === null
  ) {
    return null;
  }

  return {
    smokes: optionalBoolean(row.smokes, false),
    okWithSmoking: optionalBoolean(row.ok_with_smoking, false),
    usesMarijuana: optionalBoolean(row.uses_marijuana, false),
    okWithMarijuana: optionalBoolean(row.ok_with_marijuana, false),
    drinksAlcohol: optionalBoolean(row.drinks_alcohol, false),
    okWithAlcohol: optionalBoolean(row.ok_with_alcohol, true),
    hasPets: optionalBoolean(row.has_pets, false),
    okWithPets: optionalBoolean(row.ok_with_pets, true),
    partnerStaysOver: optionalBoolean(row.partner_stays_over, false),
    okWithPartnersStaying: optionalBoolean(row.ok_with_partners_staying, true),
    sharesFood: optionalBoolean(row.shares_food, false),
    okWithCoed: optionalBoolean(row.ok_with_coed, true),
    studyOrWfh: optionalBoolean(row.study_or_wfh, false),
    preferredAgeMin,
    preferredAgeMax,
    budgetMin,
    budgetMax,
    moveInDate: row.move_in_date,
    sleepBehaviorScore,
    sleepToleranceScore,
    cleanBehaviorScore,
    cleanToleranceScore,
    cookingBehaviorScore,
    cookingToleranceScore,
    noiseBehaviorScore,
    noiseToleranceScore,
    guestBehaviorScore,
    guestToleranceScore,
    conflictBehaviorScore,
    conflictToleranceScore,
    cohabitationToleranceScore,
  };
}

function calculateAge(birthdate: string | null): number | null {
  if (!birthdate) return null;

  const [year, month, day] = birthdate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && today.getDate() < day)) {
    age -= 1;
  }

  return age >= 18 && age <= 120 ? age : null;
}

function normalizeGender(value: string | null): Gender {
  if (value === 'man' || value === 'woman') return value;
  return null;
}

function requiredNumber(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function requiredScore(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 4) {
    return null;
  }
  return value;
}

function isIsoDate(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function optionalBoolean(value: boolean | null, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function formatGender(gender: Gender): string {
  if (gender === 'man') return 'Man';
  if (gender === 'woman') return 'Woman';
  return 'Gender not shown';
}

function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

function formatPercent(value: number): number {
  return Math.round(value * 100);
}

function topDomainSummary(domains: Record<DomainKey, number>): string {
  return Object.entries(domains)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2)
    .map(([domain, value]) => `${DOMAIN_LABELS[domain as DomainKey]} ${formatPercent(value)}%`)
    .join(' - ');
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f7fb',
  },
  header: {
    marginTop: 28,
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#5E6A7D',
    lineHeight: 21,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4EAF2',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  panelSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#CFE0F3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
  errorBanner: {
    color: '#B42318',
    backgroundColor: '#FEEDEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
  matchList: {
    gap: 10,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  matchCard: {
    borderWidth: 1,
    borderColor: '#E7EDF5',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FCFDFF',
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  matchMeta: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 3,
  },
  scorePill: {
    backgroundColor: '#EAF4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filteredPill: {
    backgroundColor: '#FFF2E5',
  },
  scoreText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },
  filteredText: {
    color: '#B54708',
  },
  matchDetail: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  authError: {
    color: '#B42318',
    textAlign: 'center',
    marginTop: 16,
  },
  signOutBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
