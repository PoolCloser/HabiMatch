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

  test('preserves unknown auth messages', () => {
    assert.equal(
      formatAuthError(authError('Rate limit exceeded. Try again later.')),
      'Rate limit exceeded. Try again later.',
    );
  });
});
