import { supabase } from './supabase';
import { getErrorMessage, getFunctionInvokeErrorMessage } from './errors';
import { deleteProfilePhotos } from './profilePhotos';

async function signOutLocally(): Promise<void> {
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    throw signOutError;
  }
}

async function deleteAccountViaEdgeFunction(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    throw error;
  }

  const payload = data as { error?: string; success?: boolean } | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }
  if (!payload?.success) {
    throw new Error('Account deletion did not complete.');
  }
}

async function deleteAccountViaRpc(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    throw error;
  }
}

function shouldRetryWithEdgeFunction(rpcMessage: string): boolean {
  const normalized = rpcMessage.toLowerCase();
  return (
    normalized.includes('auth_user_delete_failed') ||
    normalized.includes('could not find the function') ||
    normalized.includes('does not exist')
  );
}

async function deleteStoredProfilePhotos(): Promise<void> {
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('No signed-in user found.');
  }

  await deleteProfilePhotos(userId);
}

export async function deleteAccount(): Promise<void> {
  await deleteStoredProfilePhotos();

  const { error: rpcError } = await supabase.rpc('delete_my_account');

  if (!rpcError) {
    await signOutLocally();
    return;
  }

  const rpcMessage = getErrorMessage(rpcError, 'Could not delete your account.');

  if (!shouldRetryWithEdgeFunction(rpcMessage)) {
    throw new Error(rpcMessage);
  }

  try {
    await deleteAccountViaEdgeFunction();
    await signOutLocally();
  } catch (edgeFailure) {
    const edgeMessage = await getFunctionInvokeErrorMessage(
      edgeFailure,
      'Could not delete your account.',
    );
    throw new Error(edgeMessage || rpcMessage);
  }
}
