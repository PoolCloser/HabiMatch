import type { AuthError } from '@supabase/supabase-js';

/** Map Supabase auth errors to short, user-facing copy. */
export function formatAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (msg.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password does not meet requirements.';
  }
  if (msg.includes('signup_disabled')) {
    return 'Sign up is disabled. Contact support.';
  }

  return error.message;
}
