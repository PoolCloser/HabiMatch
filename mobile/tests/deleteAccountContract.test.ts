import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(process.cwd());

const readSource = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

describe('delete account contract', () => {
  test('uses database RPC first and edge function only as auth fallback', () => {
    const lib = readSource('src/lib/deleteAccount.ts');

    const mainFlow = lib.split('export async function deleteAccount')[1] ?? '';
    const rpcIndex = mainFlow.indexOf("rpc('delete_my_account')");
    const edgeIndex = mainFlow.indexOf('deleteAccountViaEdgeFunction');
    assert.ok(rpcIndex >= 0);
    assert.ok(edgeIndex >= 0);
    assert.ok(rpcIndex < edgeIndex);
    assert.match(lib, /deleteProfilePhotos/);
    assert.match(lib, /shouldRetryWithEdgeFunction/);
    assert.match(lib, /getFunctionInvokeErrorMessage/);
  });

  test('wires profile settings delete action to Supabase cleanup', () => {
    const home = readSource('src/screens/HomeScreen.tsx');

    assert.match(home, /handleDeleteAccount/);
    assert.match(home, /deleteAccountError/);
    assert.match(home, /Alert\.alert\('Could not delete account'/);
    assert.doesNotMatch(home, /needs backend support before it can be enabled/);
  });
});
