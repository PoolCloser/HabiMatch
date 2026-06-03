import { FunctionsHttpError } from '@supabase/supabase-js';

type ErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
};

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message && error.message !== 'Edge Function returned a non-2xx status code') {
    return error.message;
  }

  const record = error as ErrorLike;
  const parts = [record.message, record.details, record.hint].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  if (parts.length > 0) {
    const combined = parts.join(' ');
    if (combined !== 'Edge Function returned a non-2xx status code') {
      return combined;
    }
  }

  return fallback;
}

export async function getFunctionInvokeErrorMessage(
  error: unknown,
  fallback = 'Account deletion failed.',
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string; message?: string };
        if (body.error?.trim()) return body.error;
        if (body.message?.trim()) return body.message;
      } catch {
        try {
          const text = await response.clone().text();
          if (text.trim()) return text;
        } catch {
          // ignore parse failures
        }
      }
    }
  }

  return getErrorMessage(error, fallback);
}
