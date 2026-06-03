import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  calculateCompatibility,
  type MatchParticipant,
  type MatchPreferences,
} from '../src/lib/matching';

const matchingPreferences: MatchPreferences = {
  smokes: false,
  usesMarijuana: false,
  drinksAlcohol: false,
  hasPets: false,
  partnerStaysOver: 1,
  okWithPartnersStaying: 2,
  studyOrWfh: false,
  budgetMin: 1200,
  budgetMax: 1800,
  moveInDate: '2026-08-01',
  sleepBehaviorScore: 2,
  sleepToleranceScore: 3,
  cleanBehaviorScore: 3,
  cleanToleranceScore: 3,
  cookingBehaviorScore: 2,
  cookingToleranceScore: 3,
  noiseBehaviorScore: 1,
  noiseToleranceScore: 3,
  guestBehaviorScore: 1,
  guestToleranceScore: 3,
  conflictBehaviorScore: 2,
  conflictToleranceScore: 2,
  cohabitationToleranceScore: 3,
};

const participant = (
  userId: string,
  preferences: Partial<MatchPreferences> = {},
): MatchParticipant => ({
  userId,
  age: 24,
  gender: null,
  preferences: {
    ...matchingPreferences,
    ...preferences,
  },
});

describe('calculateCompatibility', () => {
  test('returns a perfect score for identical compatible preferences', () => {
    const result = calculateCompatibility(participant('left'), participant('right'));

    assert.equal(result.passedFilters, true);
    assert.equal(result.overallScore, 1);
    assert.deepEqual(result.failures, []);
    assert.equal(result.domains.logistics, 1);
    assert.equal(result.domains.sleep, 1);
    assert.equal(result.domains.cleanliness, 1);
    assert.equal(result.domains.noise, 1);
    assert.equal(result.domains.guests, 1);
    assert.equal(result.domains.cohabitation, 1);
    assert.equal(result.domains.conflict, 1);
  });

  test('fails when budget ranges do not overlap', () => {
    const result = calculateCompatibility(
      participant('left', { budgetMin: 1000, budgetMax: 1300 }),
      participant('right', { budgetMin: 1500, budgetMax: 2000 }),
    );

    assert.equal(result.passedFilters, false);
    assert.equal(result.overallScore, 0);
    assert.deepEqual(result.failures, ['Budget ranges do not overlap.']);
    assert.deepEqual(result.domains, {
      logistics: 0,
      sleep: 0,
      cleanliness: 0,
      noise: 0,
      guests: 0,
      cohabitation: 0,
      conflict: 0,
    });
  });

  test('fails when move-in timelines are too far apart', () => {
    const result = calculateCompatibility(
      participant('left', { moveInDate: '2026-08-01' }),
      participant('right', { moveInDate: '2026-11-01' }),
    );

    assert.equal(result.passedFilters, false);
    assert.equal(result.overallScore, 0);
    assert.deepEqual(result.failures, ['Move-in timelines are too far apart.']);
  });

  test('reports every hard-filter failure', () => {
    const result = calculateCompatibility(
      participant('left', {
        budgetMin: 1000,
        budgetMax: 1300,
        moveInDate: '2026-08-01',
      }),
      participant('right', {
        budgetMin: 1500,
        budgetMax: 2000,
        moveInDate: '2026-11-01',
      }),
    );

    assert.equal(result.passedFilters, false);
    assert.deepEqual(result.failures, [
      'Budget ranges do not overlap.',
      'Move-in timelines are too far apart.',
    ]);
  });

  test('does not fail on lifestyle choices that are controlled by feed filters', () => {
    const result = calculateCompatibility(
      participant('left', {
        smokes: true,
        usesMarijuana: true,
        drinksAlcohol: true,
        hasPets: true,
      }),
      participant('right'),
    );

    assert.equal(result.passedFilters, true);
    assert.deepEqual(result.failures, []);
  });

  test('keeps compatible partial overlap scores within the unit range', () => {
    const result = calculateCompatibility(
      participant('left', {
        budgetMin: 1000,
        budgetMax: 1600,
        moveInDate: '2026-08-01',
      }),
      participant('right', {
        budgetMin: 1400,
        budgetMax: 2000,
        moveInDate: '2026-08-31',
      }),
    );

    assert.equal(result.passedFilters, true);
    assert.equal(result.failures.length, 0);
    assert.equal(result.domains.logistics, 0.5);
    assert.ok(result.overallScore > 0);
    assert.ok(result.overallScore < 1);
  });

  test('weights noise mismatch more heavily when a sensitive roommate works from home', () => {
    const basePreferences: Partial<MatchPreferences> = {
      noiseToleranceScore: 1,
    };
    const noisyPreferences: Partial<MatchPreferences> = {
      noiseBehaviorScore: 4,
    };

    const withoutWfh = calculateCompatibility(
      participant('left', basePreferences),
      participant('right', noisyPreferences),
    );
    const withWfh = calculateCompatibility(
      participant('left', { ...basePreferences, studyOrWfh: true }),
      participant('right', noisyPreferences),
    );

    assert.equal(withoutWfh.passedFilters, true);
    assert.equal(withWfh.passedFilters, true);
    assert.equal(withoutWfh.domains.noise, withWfh.domains.noise);
    assert.ok(withWfh.domains.noise < 1);
    assert.ok(withWfh.overallScore < withoutWfh.overallScore);
  });
});
