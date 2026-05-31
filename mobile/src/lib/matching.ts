export type Gender = 'man' | 'woman' | null;

export type MatchPreferences = {
  smokes: boolean;
  usesMarijuana: boolean;
  drinksAlcohol: boolean;
  hasPets: boolean;
  partnerStaysOver: number;
  okWithPartnersStaying: number;
  studyOrWfh: boolean;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  sleepBehaviorScore: number;
  sleepToleranceScore: number;
  cleanBehaviorScore: number;
  cleanToleranceScore: number;
  cookingBehaviorScore: number;
  cookingToleranceScore: number;
  noiseBehaviorScore: number;
  noiseToleranceScore: number;
  guestBehaviorScore: number;
  guestToleranceScore: number;
  conflictBehaviorScore: number;
  conflictToleranceScore: number;
  cohabitationToleranceScore: number;
};

export type MatchParticipant = {
  userId: string;
  age: number;
  gender: Gender;
  preferences: MatchPreferences;
};

export type DomainKey =
  | 'logistics'
  | 'sleep'
  | 'cleanliness'
  | 'noise'
  | 'guests'
  | 'cohabitation'
  | 'conflict';

export type CompatibilityResult = {
  passedFilters: boolean;
  overallScore: number;
  failures: string[];
  domains: Record<DomainKey, number>;
};

const SCORE_MAX = 4;
const MOVE_IN_MAX_GAP_DAYS = 90;
const NOISE_WFH_MULTIPLIER = 1.25;

// Demo-side mirror of backend/app/matching.py. Keep weights and hard filters aligned.
const DOMAIN_KEYS: DomainKey[] = [
  'logistics',
  'sleep',
  'cleanliness',
  'noise',
  'guests',
  'cohabitation',
  'conflict',
];

const BASE_DOMAIN_WEIGHTS: Record<DomainKey, number> = {
  logistics: 0.10,
  sleep: 0.20,
  cleanliness: 0.20,
  noise: 0.15,
  guests: 0.15,
  cohabitation: 0.20,
  conflict: 0.10,
};

const EMPTY_DOMAINS = DOMAIN_KEYS.reduce(
  (domains, key) => ({ ...domains, [key]: 0 }),
  {} as Record<DomainKey, number>,
);

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function directionalToleranceFit(behavior: number, tolerance: number): number {
  const gap = Math.max(0, behavior - tolerance);
  return clampUnit(1 - gap / SCORE_MAX);
}

function thresholdScore(
  leftBehavior: number,
  leftTolerance: number,
  rightBehavior: number,
  rightTolerance: number,
): number {
  const leftFit = directionalToleranceFit(rightBehavior, leftTolerance);
  const rightFit = directionalToleranceFit(leftBehavior, rightTolerance);
  return clampUnit(Math.sqrt(leftFit * rightFit));
}

function similarityScore(leftValue: number, rightValue: number): number {
  return clampUnit(1 - Math.abs(leftValue - rightValue) / SCORE_MAX);
}

function pairedSimilarityScore(
  leftBehavior: number,
  leftTolerance: number,
  rightBehavior: number,
  rightTolerance: number,
): number {
  return (
    similarityScore(leftBehavior, rightBehavior)
    + similarityScore(leftTolerance, rightTolerance)
  ) / 2;
}

function overlapRatio(minA: number, maxA: number, minB: number, maxB: number): number {
  const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
  const smallerRange = Math.max(Math.min(maxA - minA, maxB - minB), 1);
  return clampUnit(overlap / smallerRange);
}

function moveInGapDays(leftDate: string, rightDate: string): number {
  return Math.abs(daysSinceEpoch(leftDate) - daysSinceEpoch(rightDate));
}

function daysSinceEpoch(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function moveInScore(gapDays: number): number {
  return clampUnit(1 - gapDays / MOVE_IN_MAX_GAP_DAYS);
}

function normalizedWeights(left: MatchParticipant, right: MatchParticipant): Record<DomainKey, number> {
  const weights = { ...BASE_DOMAIN_WEIGHTS };
  const leftSensitivity = left.preferences.studyOrWfh
    ? (SCORE_MAX - left.preferences.noiseToleranceScore) / SCORE_MAX
    : 0;
  const rightSensitivity = right.preferences.studyOrWfh
    ? (SCORE_MAX - right.preferences.noiseToleranceScore) / SCORE_MAX
    : 0;
  const wfhSensitivity = Math.max(leftSensitivity, rightSensitivity);
  weights.noise *= 1 + (NOISE_WFH_MULTIPLIER - 1) * wfhSensitivity;

  const total = DOMAIN_KEYS.reduce((sum, key) => sum + weights[key], 0);
  return DOMAIN_KEYS.reduce(
    (normalized, key) => ({ ...normalized, [key]: round4(weights[key] / total) }),
    {} as Record<DomainKey, number>,
  );
}

export function calculateCompatibility(
  left: MatchParticipant,
  right: MatchParticipant,
): CompatibilityResult {
  const leftP = left.preferences;
  const rightP = right.preferences;

  const budgetOverlap = Math.max(leftP.budgetMin, rightP.budgetMin) <= Math.min(leftP.budgetMax, rightP.budgetMax);
  const budgetOverlapRatio = overlapRatio(leftP.budgetMin, leftP.budgetMax, rightP.budgetMin, rightP.budgetMax);
  const gapDays = moveInGapDays(leftP.moveInDate, rightP.moveInDate);
  const moveInCompatible = gapDays <= MOVE_IN_MAX_GAP_DAYS;

  const failures: string[] = [];
  if (!budgetOverlap) failures.push('Budget ranges do not overlap.');
  if (!moveInCompatible) failures.push('Move-in timelines are too far apart.');

  if (failures.length > 0) {
    return {
      passedFilters: false,
      overallScore: 0,
      failures,
      domains: { ...EMPTY_DOMAINS },
    };
  }

  const logisticsScore = (
    budgetOverlapRatio * 0.50
    + moveInScore(gapDays) * 0.50
  );
  const sleepScore = thresholdScore(
    leftP.sleepBehaviorScore,
    leftP.sleepToleranceScore,
    rightP.sleepBehaviorScore,
    rightP.sleepToleranceScore,
  );
  const cleaningScore = thresholdScore(
    leftP.cleanBehaviorScore,
    leftP.cleanToleranceScore,
    rightP.cleanBehaviorScore,
    rightP.cleanToleranceScore,
  );
  const cookingScore = thresholdScore(
    leftP.cookingBehaviorScore,
    leftP.cookingToleranceScore,
    rightP.cookingBehaviorScore,
    rightP.cookingToleranceScore,
  );
  const noiseScore = thresholdScore(
    leftP.noiseBehaviorScore,
    leftP.noiseToleranceScore,
    rightP.noiseBehaviorScore,
    rightP.noiseToleranceScore,
  );
  const generalGuestsScore = thresholdScore(
    leftP.guestBehaviorScore,
    leftP.guestToleranceScore,
    rightP.guestBehaviorScore,
    rightP.guestToleranceScore,
  );
  const overnightScore = thresholdScore(
    leftP.partnerStaysOver,
    leftP.okWithPartnersStaying,
    rightP.partnerStaysOver,
    rightP.okWithPartnersStaying,
  );
  const guestsScore = (generalGuestsScore + overnightScore) / 2;
  const conflictScore = pairedSimilarityScore(
    leftP.conflictBehaviorScore,
    leftP.conflictToleranceScore,
    rightP.conflictBehaviorScore,
    rightP.conflictToleranceScore,
  );
  const cohabitationScore = similarityScore(leftP.cohabitationToleranceScore, rightP.cohabitationToleranceScore);

  const domains: Record<DomainKey, number> = {
    logistics: round4(logisticsScore),
    sleep: round4(sleepScore),
    cleanliness: round4((cleaningScore + cookingScore) / 2),
    noise: round4(noiseScore),
    guests: round4(guestsScore),
    cohabitation: round4(cohabitationScore),
    conflict: round4(conflictScore),
  };
  const weights = normalizedWeights(left, right);
  const overall = DOMAIN_KEYS.reduce((sum, key) => sum + domains[key] * weights[key], 0);

  return {
    passedFilters: true,
    overallScore: round4(overall),
    failures: [],
    domains,
  };
}
