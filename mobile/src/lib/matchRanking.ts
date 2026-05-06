import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateCompatibility,
  type DomainKey,
  type Gender,
  type MatchParticipant,
  type MatchPreferences,
} from './matching';

export type RankedMatch = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  age: number;
  gender: Gender;
  score: number;
  passedFilters: boolean;
  failures: string[];
  domains: Record<DomainKey, number>;
  /** Preferences incomplete — show profile in feed but no real compatibility score. */
  incompleteData?: boolean;
};

type ProfileRecord = {
  id: string;
  birthdate: string | null;
  gender: string | null;
  questionnaire_complete: boolean | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
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
  cohabitation_behavior_score: number | null;
  cohabitation_tolerance_score: number | null;
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
  'cohabitation_behavior_score',
  'cohabitation_tolerance_score',
].join(',');

const PROFILE_COLUMNS =
  'id,birthdate,gender,questionnaire_complete,full_name,avatar_url,bio,location';

const EMPTY_DOMAINS: Record<DomainKey, number> = {
  logistics: 0,
  sleep: 0,
  cleanliness: 0,
  noise: 0,
  guests: 0,
  cohabitation: 0,
  conflict: 0,
};

export async function fetchDecidedTargetIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('discovery_decisions')
    .select('target_user_id')
    .eq('user_id', userId);

  if (error) {
    console.warn('[discovery_decisions]', error.message);
    return new Set();
  }

  return new Set((data ?? []).map(row => row.target_user_id as string));
}

export async function saveDiscoveryDecision(
  supabase: SupabaseClient,
  userId: string,
  targetUserId: string,
  decision: 'pass' | 'like',
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { error } = await supabase.from('discovery_decisions').upsert(
    {
      user_id: userId,
      target_user_id: targetUserId,
      decision,
    },
    { onConflict: 'user_id,target_user_id' },
  );

  if (error) {
    return { ok: false, errorMessage: error.message };
  }
  return { ok: true };
}

export type DiscoverFeedResult = {
  userId: string;
  feed: RankedMatch[];
  incompleteSkipped: number;
  filteredOutCount: number;
  needsQuestionnaire: boolean;
  error: string | null;
};

export async function loadDiscoverFeed(supabase: SupabaseClient): Promise<DiscoverFeedResult> {
  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = authData.user?.id;
    if (!userId) throw new Error('No signed-in user found.');

    const decided = await fetchDecidedTargetIds(supabase, userId);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS);
    if (profileError) throw profileError;

    const { data: preferenceData, error: preferenceError } = await supabase
      .from('lifestyle_preferences')
      .select(PREFERENCE_COLUMNS);
    if (preferenceError) throw preferenceError;

    const profiles = (profileData ?? []) as ProfileRecord[];
    const preferences = (preferenceData ?? []) as unknown as PreferenceRecord[];
    const preferencesByUser = new Map(preferences.map(row => [row.user_id, row]));
    const profileById = new Map(profiles.map(p => [p.id, p]));

    const currentProfile = profiles.find(p => p.id === userId) ?? null;
    const currentPreferences = preferencesByUser.get(userId) ?? null;
    const currentParticipant = toParticipant(currentProfile, currentPreferences);

    if (!currentParticipant) {
      return {
        userId,
        feed: [],
        incompleteSkipped: 0,
        filteredOutCount: 0,
        needsQuestionnaire: true,
        error: null,
      };
    }

    let incompleteSkipped = 0;
    const ranked: RankedMatch[] = [];

    const others = profiles.filter(p => p.id !== userId);

    for (const profile of others) {
      const p = profileById.get(profile.id)!;
      const candidate = toParticipant(profile, preferencesByUser.get(profile.id) ?? null);

      if (!candidate) {
        const age = calculateAge(profile.birthdate);
        if (age !== null) {
          const msg = !profile.questionnaire_complete
            ? 'Still completing their questionnaire.'
            : 'Questionnaire data is incomplete — no compatibility score yet.';
          ranked.push({
            userId: profile.id,
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            bio: p.bio,
            location: p.location,
            age,
            gender: normalizeGender(profile.gender),
            score: 0,
            passedFilters: false,
            failures: [msg],
            domains: { ...EMPTY_DOMAINS },
            incompleteData: true,
          });
        } else {
          incompleteSkipped += 1;
        }
        continue;
      }

      const result = calculateCompatibility(currentParticipant, candidate);

      ranked.push({
        userId: candidate.userId,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        location: p.location,
        age: candidate.age,
        gender: candidate.gender,
        score: result.overallScore,
        passedFilters: result.passedFilters,
        failures: result.failures,
        domains: result.domains,
        incompleteData: false,
      });
    }

    ranked.sort((left, right) => {
      if (!!left.incompleteData !== !!right.incompleteData) {
        return left.incompleteData ? 1 : -1;
      }
      if (left.incompleteData && right.incompleteData) {
        return 0;
      }
      if (left.passedFilters !== right.passedFilters) {
        return left.passedFilters ? -1 : 1;
      }
      return right.score - left.score;
    });

    const filteredOutCount = ranked.filter(m => !m.passedFilters && !m.incompleteData).length;
    const feed = ranked.filter(m => !decided.has(m.userId));

    return {
      userId,
      feed,
      incompleteSkipped,
      filteredOutCount,
      needsQuestionnaire: false,
      error: null,
    };
  } catch (e) {
    return {
      userId: '',
      feed: [],
      incompleteSkipped: 0,
      filteredOutCount: 0,
      needsQuestionnaire: false,
      error: e instanceof Error ? e.message : 'Could not load discover feed.',
    };
  }
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
  const cohabitationBehaviorScore = requiredScore(
    row.cohabitation_behavior_score ?? row.cohabitation_tolerance_score,
  );
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
    || cohabitationBehaviorScore === null
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
    cohabitationBehaviorScore,
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
