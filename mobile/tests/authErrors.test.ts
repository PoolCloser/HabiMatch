import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { AuthError } from '@supabase/supabase-js';
import { formatAuthError } from '../src/lib/authErrors';

const authError = (message: string): AuthError => ({ message } as AuthError);

describe('formatAuthError', () => {
  test('returns concise copy for invalid credentials', () => {
    assert.equal(
      formatAuthError(authError('Invalid login credentials')),
      'Invalid email or password.',
    );
  });

  test('returns concise copy for an unconfirmed email', () => {
    assert.equal(
      formatAuthError(authError('Email not confirmed')),
      'Please confirm your email before signing in.',
    );
  });

  test('returns concise copy for known sign-up failures', () => {
    const cases = [
      ['User already registered', 'An account with this email already exists.'],
      ['Password should be at least 6 characters', 'Password does not meet requirements.'],
      ['signup_disabled', 'Sign up is disabled. Contact support.'],
    ] as const;

    for (const [message, expected] of cases) {
      assert.equal(formatAuthError(authError(message)), expected);
    }
  });

  test('matches known errors case-insensitively', () => {
    assert.equal(
      formatAuthError(authError('INVALID LOGIN CREDENTIALS')),
      'Invalid email or password.',
    );
  });

  test('preserves unknown auth messages', () => {
    assert.equal(
      formatAuthError(authError('Rate limit exceeded. Try again later.')),
      'Rate limit exceeded. Try again later.',
    );
  });
});
