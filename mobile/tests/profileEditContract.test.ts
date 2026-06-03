import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(process.cwd());

const readSource = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

describe('profile edit contract', () => {
  test('keeps account actions behind the profile settings gear', () => {
    const source = readSource('src/screens/HomeScreen.tsx');

    assert.match(source, /showProfileSettings/);
    assert.match(source, /settings-outline/);
    assert.match(source, /Profile settings/);
    assert.match(source, /handleSignOut/);
    assert.match(source, /Delete account/);
    assert.match(source, /handleDeleteAccount/);

    const profileBody = source.split('<Text style={styles.settingsTitle}>Profile settings</Text>', 1)[0];
    assert.doesNotMatch(profileBody, /<Text style={styles\.settingsActionText}>Sign out<\/Text>/);
    assert.doesNotMatch(profileBody, /<Text style={styles\.deleteActionText}>Delete account<\/Text>/);
  });

  test('lets the profile tab launch questionnaire preference updates', () => {
    const source = readSource('src/screens/HomeScreen.tsx');

    assert.match(source, /QuestionnaireScreen/);
    assert.match(source, /editingPreferences/);
    assert.match(source, /Update Preferences/);
    assert.match(source, /mode="edit"/);
    assert.match(source, /setEditingPreferences\(true\)/);
  });

  test('supports questionnaire edit mode with existing answer prefill', () => {
    const source = readSource('src/screens/QuestionnaireScreen.tsx');

    assert.match(source, /mode\?: 'onboarding' \| 'edit'/);
    assert.match(source, /loadExistingPreferences/);
    assert.match(source, /\.from\('lifestyle_preferences'\)/);
    assert.match(source, /setAnswers/);
    assert.match(source, /existingPreferenceToAnswers/);
    assert.match(source, /onCancel/);
  });

  test('uses a home icon for the empty messages state', () => {
    const source = readSource('src/screens/MessagesScreen.tsx');

    assert.match(source, /name="home-outline"|name="bed-outline"/);
    assert.doesNotMatch(source, /name="heart-outline"/);
  });
});
