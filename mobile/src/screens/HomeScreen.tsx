import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { uploadProfilePhoto } from '../lib/profilePhotos';
import {
  calculateCompatibility,
  type DomainKey,
  type Gender,
  type MatchParticipant,
  type MatchPreferences,
} from '../lib/matching';

type ProfileRecord = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birthdate: string | null;
  gender: string | null;
  location: string | null;
  questionnaire_complete: boolean | null;
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
  partner_stays_over: number | null;
  ok_with_partners_staying: number | null;
  study_or_wfh: boolean | null;
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
  cohabitation_tolerance_score: number | null;
};

type RankedMatch = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  age: number;
  gender: Gender;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  score: number;
  passedFilters: boolean;
  failures: string[];
  domains: Record<DomainKey, number>;
};

type DiscoveryDecision = 'like' | 'dislike';

const PRIMARY = '#4A90D9';
const TEXT = '#111827';
const MUTED = '#6B7280';
const CARD = '#FFFFFF';

type DashboardTab = 'feed' | 'profile';
const DOMAIN_LABELS: Record<DomainKey, string> = {
  logistics: 'Logistics',
  sleep: 'Sleep',
  cleanliness: 'Clean',
  noise: 'Noise',
  guests: 'Guests',
  cohabitation: 'Habits',
  conflict: 'Conflict',
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
  'study_or_wfh',
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
  'cohabitation_tolerance_score',
].join(',');

const MATCH_LIMIT = 8;

export default function HomeScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [authError, setAuthError] = useState('');
  const [rankingError, setRankingError] = useState('');
  const [matches, setMatches] = useState<RankedMatch[]>([]);
  const [currentUser, setCurrentUser] = useState<RankedMatch | null>(null);
  const [selfProfile, setSelfProfile] = useState<ProfileRecord | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>('feed');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const [savingDecision, setSavingDecision] = useState<DiscoveryDecision | null>(null);
  const [decisionError, setDecisionError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'man' | 'woman' | null>(null);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  const markImageFailed = (url: string) => {
    setFailedImageUrls(current => new Set(current).add(url));
  };

  const loadRankings = async () => {
    setLoadingMatches(true);
    setRankingError('');
    setDecisionError('');

    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No signed-in user found.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,full_name,avatar_url,bio,birthdate,gender,location,questionnaire_complete')
        .eq('questionnaire_complete', true);
      if (profileError) throw profileError;

      const { data: selfData, error: selfError } = await supabase
        .from('profiles')
        .select('id,full_name,avatar_url,bio,birthdate,gender,location,questionnaire_complete')
        .eq('id', userId)
        .maybeSingle<ProfileRecord>();
      if (selfError) throw selfError;
      setSelfProfile(selfData ?? null);

      const { data: preferenceData, error: preferenceError } = await supabase
        .from('lifestyle_preferences')
        .select(PREFERENCE_COLUMNS);
      if (preferenceError) throw preferenceError;

      const { data: decisionData, error: discoveryError } = await supabase
        .from('discovery_decisions')
        .select('target_user_id')
        .eq('user_id', userId);
      if (discoveryError) throw discoveryError;

      const profiles = (profileData ?? []) as ProfileRecord[];
      const preferences = (preferenceData ?? []) as unknown as PreferenceRecord[];
      const decidedUserIds = new Set(
        ((decisionData ?? []) as { target_user_id: string | null }[])
          .map(row => row.target_user_id)
          .filter((id): id is string => Boolean(id)),
      );
      const preferencesByUser = new Map(preferences.map(row => [row.user_id, row]));
      const currentProfile = profiles.find(profile => profile.id === userId) ?? null;
      const currentPreferences = preferencesByUser.get(userId) ?? null;
      const currentParticipant = toParticipant(currentProfile, currentPreferences);

      if (!currentProfile || !currentPreferences || !currentParticipant) {
        setMatches([]);
        setCurrentUser(null);
        setSkippedCount(0);
        setRankingError('Complete your profile and questionnaire before matching.');
        return;
      }

      setCurrentUser(toRankedProfile(currentParticipant, currentProfile, currentPreferences, {
        score: 1,
        passedFilters: true,
        failures: [],
        domains: {
          logistics: 1,
          sleep: 1,
          cleanliness: 1,
          noise: 1,
          guests: 1,
          cohabitation: 1,
          conflict: 1,
        },
      }));

      let skipped = 0;
      const ranked = profiles
        .filter(profile => profile.id !== userId && !decidedUserIds.has(profile.id))
        .map(profile => {
          const candidatePreferences = preferencesByUser.get(profile.id) ?? null;
          const candidate = toParticipant(profile, candidatePreferences);
          if (!candidate || !candidatePreferences) {
            skipped += 1;
            return null;
          }

          const result = calculateCompatibility(currentParticipant, candidate);
          return toRankedProfile(candidate, profile, candidatePreferences, {
            score: result.overallScore,
            passedFilters: result.passedFilters,
            failures: result.failures,
            domains: result.domains,
          });
        })
        .filter((match): match is RankedMatch => match !== null)
        .sort((left, right) => {
          if (left.passedFilters !== right.passedFilters) {
            return left.passedFilters ? -1 : 1;
          }
          return right.score - left.score;
        })
        .slice(0, MATCH_LIMIT);

      setMatches(ranked);
      setSkippedCount(skipped);
    } catch (error) {
      setMatches([]);
      setCurrentUser(null);
      setSelfProfile(null);
      setSkippedCount(0);
      setRankingError(error instanceof Error ? error.message : 'Could not load compatibility rankings.');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    void loadRankings();
  }, []);

  useEffect(() => {
    if (!selfProfile) return;
    setProfileName(selfProfile.full_name ?? '');
    setProfileBio(selfProfile.bio ?? '');
    setProfileLocation(selfProfile.location ?? '');
    setProfileSaveError('');
    setProfileSaveMessage('');
  }, [selfProfile?.id]);

  const handleSignOut = async () => {
    setAuthError('');
    setSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setAuthError(signOutError.message);
    } finally {
      setSigningOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selfProfile) return;

    setSavingProfile(true);
    setProfileSaveError('');
    setProfileSaveMessage('');

    try {
      const nextName = profileName.trim();
      const nextBio = profileBio.trim();
      const nextLocation = profileLocation.trim();
      if (!nextName) {
        setProfileSaveError('Display name is required.');
        return;
      }
      if (!nextLocation) {
        setProfileSaveError('Location is required.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: nextName,
          bio: nextBio || null,
          location: nextLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selfProfile.id);

      if (error) throw error;

      setSelfProfile(current => current
        ? { ...current, full_name: nextName, bio: nextBio || null, location: nextLocation }
        : current);
      setCurrentUser(current => current
        ? { ...current, fullName: nextName, bio: nextBio || null, location: nextLocation }
        : current);
      setProfileSaveMessage('Profile updated.');
    } catch {
      setProfileSaveError('Could not save your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChooseProfilePhoto = async () => {
    if (!selfProfile) return;

    setProfileSaveError('');
    setProfileSaveMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileSaveError('Allow photo access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const selectedAsset = result.assets[0];
    if (!selectedAsset?.uri) return;

    setUpdatingPhoto(true);

    try {
      const avatarUrl = await uploadProfilePhoto(selfProfile.id, selectedAsset);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selfProfile.id);
      if (profileError) throw profileError;

      setSelfProfile(current => current ? { ...current, avatar_url: avatarUrl } : current);
      setCurrentUser(current => current ? { ...current, avatarUrl } : current);
      setProfileSaveMessage('Profile picture updated.');
    } catch {
      setProfileSaveError('Could not update your profile picture. Please try again.');
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleDiscoveryDecision = async (decision: DiscoveryDecision) => {
    if (!topMatch || savingDecision) return;

    setSavingDecision(decision);
    setDecisionError('');

    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No signed-in user found.');

      const { error } = await supabase
        .from('discovery_decisions')
        .upsert({
          user_id: userId,
          target_user_id: topMatch.userId,
          decision,
        }, {
          onConflict: 'user_id,target_user_id',
        });
      if (error) throw error;

      setMatches(current => current.filter(match => match.userId !== topMatch.userId));
    } catch (error) {
      console.error('Could not save discovery decision', error);
      setDecisionError('Could not save your choice. Please try again.');
    } finally {
      setSavingDecision(null);
    }
  };

  const hasActiveFilters = genderFilter !== null || ageMin !== '' || ageMax !== '';

  const filteredMatches = matches.filter(match => {
    if (genderFilter && match.gender !== genderFilter) return false;
    const parsedMin = parseInt(ageMin, 10);
    const parsedMax = parseInt(ageMax, 10);
    if (!isNaN(parsedMin) && match.age < parsedMin) return false;
    if (!isNaN(parsedMax) && match.age > parsedMax) return false;
    return true;
  });

  const topMatch = filteredMatches[0] ?? null;

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        {activeTab === 'feed' ? (
          <>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.logo}>HM</Text>
                <Text style={styles.screenTitle}>Roommate Feed</Text>
              </View>
              <TouchableOpacity
                style={[styles.iconTextBtn, hasActiveFilters && styles.iconTextBtnActive]}
                onPress={() => setShowFilters(v => !v)}
                accessibilityLabel="Toggle filters"
              >
                <Ionicons name="options-outline" size={17} color={hasActiveFilters ? CARD : PRIMARY} />
                <Text style={[styles.iconText, hasActiveFilters && styles.iconTextActive]}>Filter</Text>
              </TouchableOpacity>
            </View>

            {rankingError ? <Text style={styles.errorBanner}>{rankingError}</Text> : null}

            {showFilters && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterSectionLabel}>Gender</Text>
                <View style={styles.filterPillRow}>
                  {(['man', 'woman'] as const).map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.filterPill, genderFilter === g && styles.filterPillActive]}
                      onPress={() => setGenderFilter(genderFilter === g ? null : g)}
                    >
                      <Text style={[styles.filterPillText, genderFilter === g && styles.filterPillTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.filterSectionLabel}>Age range</Text>
                <View style={styles.ageRangeRow}>
                  <TextInput
                    style={styles.ageRangeInput}
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor="#9CA3AF"
                    value={ageMin}
                    onChangeText={v => setAgeMin(v.replace(/[^0-9]/g, ''))}
                    onBlur={() => {
                      const n = parseInt(ageMin, 10);
                      if (!isNaN(n) && n < 18) setAgeMin('18');
                    }}
                    maxLength={3}
                  />
                  <Text style={styles.ageRangeSep}>–</Text>
                  <TextInput
                    style={styles.ageRangeInput}
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor="#9CA3AF"
                    value={ageMax}
                    onChangeText={v => setAgeMax(v.replace(/[^0-9]/g, ''))}
                    maxLength={3}
                  />
                </View>
              </View>
            )}

            {loadingMatches ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={styles.loadingText}>Scoring matches...</Text>
              </View>
            ) : topMatch ? (
              <View style={styles.heroCard}>
                <View style={styles.matchHeader}>
                  <View>
                    <Text style={styles.matchName}>{displayName(topMatch)}</Text>
                    <Text style={styles.matchMeta}>{formatProfileMeta(topMatch)}</Text>
                  </View>
                  <View style={[styles.scorePill, !topMatch.passedFilters && styles.filteredPill]}>
                    <Text style={[styles.scoreText, !topMatch.passedFilters && styles.filteredText]}>
                      {topMatch.passedFilters ? `${formatPercent(topMatch.score)}%` : 'Filtered'}
                    </Text>
                  </View>
                </View>

                <View style={styles.photoFrame}>
                  {topMatch.avatarUrl && !failedImageUrls.has(topMatch.avatarUrl) ? (
                    <Image
                      source={{ uri: topMatch.avatarUrl }}
                      style={styles.profileImage}
                      onError={() => markImageFailed(topMatch.avatarUrl as string)}
                    />
                  ) : (
                    <View style={styles.photoFallback}>
                      <Text style={styles.photoInitial}>{displayInitial(topMatch)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.infoStack}>
                  <InfoRow label="Bio" value={topMatch.bio?.trim() || 'Bio not shown yet.'} />
                  <InfoRow label="Budget" value={formatBudget(topMatch.budgetMin, topMatch.budgetMax)} />
                  <InfoRow label="Move-in date" value={formatDate(topMatch.moveInDate)} />
                  <InfoRow
                    label="Compatibility"
                    value={topMatch.passedFilters ? topDomainSummary(topMatch.domains) : topMatch.failures[0] ?? 'Dealbreaker mismatch'}
                  />
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.roundAction,
                      styles.rejectAction,
                      savingDecision && styles.actionDisabled,
                    ]}
                    onPress={() => void handleDiscoveryDecision('dislike')}
                    disabled={Boolean(savingDecision)}
                  >
                    {savingDecision === 'dislike' ? (
                      <ActivityIndicator color="#B42318" />
                    ) : (
                      <Ionicons name="close" size={24} color="#B42318" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roundAction,
                      styles.acceptAction,
                      savingDecision && styles.actionDisabled,
                    ]}
                    onPress={() => void handleDiscoveryDecision('like')}
                    disabled={Boolean(savingDecision)}
                  >
                    {savingDecision === 'like' ? (
                      <ActivityIndicator color="#067647" />
                    ) : (
                      <Ionicons name="checkmark" size={24} color="#067647" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : matches.length > 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.emptyTitle}>No matches for filters</Text>
                <Text style={styles.emptyText}>Try adjusting your age or gender filters.</Text>
              </View>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>
                  No completed roommate profiles are visible yet.
                </Text>
              </View>
            )}

            {decisionError ? <Text style={styles.authError}>{decisionError}</Text> : null}

            <View style={styles.feedMetaRow}>
              <Text style={styles.feedMetaText}>
                {matches.length > 0
                  ? hasActiveFilters
                    ? `${filteredMatches.length} of ${matches.length} shown`
                    : `${matches.length} ranked${skippedCount > 0 ? ` - ${skippedCount} incomplete skipped` : ''}`
                  : 'Waiting for completed profiles'}
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadRankings} disabled={loadingMatches}>
                <Ionicons name="refresh" size={16} color={PRIMARY} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.profileTopBar}>
              <Text style={styles.logo}>HM</Text>
              <TouchableOpacity style={styles.iconBtn} disabled>
                <Ionicons name="settings-outline" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSummary}>
              <TouchableOpacity
                style={styles.avatarLarge}
                onPress={handleChooseProfilePhoto}
                disabled={!selfProfile || updatingPhoto}
              >
                {selfProfile?.avatar_url && !failedImageUrls.has(selfProfile.avatar_url) ? (
                  <Image
                    source={{ uri: selfProfile.avatar_url }}
                    style={[styles.profileImage, styles.avatarImage]}
                    onError={() => markImageFailed(selfProfile.avatar_url as string)}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>{selfProfile ? displayProfileInitial(selfProfile) : 'H'}</Text>
                )}
                <View style={styles.photoEditBadge}>
                  {updatingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="camera-outline" size={18} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.profileName}>
                {selfProfile ? displayProfileName(selfProfile) : 'HabiMatch User'}
              </Text>
              <Text style={styles.profileMeta}>
                {selfProfile
                  ? formatSelfProfileMeta(selfProfile)
                  : 'Profile details unavailable'}
              </Text>
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.profileLabel}>Display name</Text>
              <TextInput
                style={styles.profileInput}
                value={profileName}
                onChangeText={setProfileName}
                editable={Boolean(selfProfile) && !savingProfile}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.profileLabel}>Bio</Text>
              <TextInput
                style={[styles.profileInput, styles.bioInput]}
                value={profileBio}
                onChangeText={setProfileBio}
                editable={Boolean(selfProfile) && !savingProfile}
                placeholder="Write a short roommate bio"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.profileLabel}>Location</Text>
              <TextInput
                style={styles.profileInput}
                value={profileLocation}
                onChangeText={setProfileLocation}
                editable={Boolean(selfProfile) && !savingProfile}
                placeholder="City, state"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {profileSaveError ? <Text style={styles.authError}>{profileSaveError}</Text> : null}
            {profileSaveMessage ? <Text style={styles.successText}>{profileSaveMessage}</Text> : null}

            <TouchableOpacity
              style={[
                styles.profileAction,
                (!selfProfile || savingProfile || !profileName.trim() || !profileLocation.trim()) && styles.btnDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={!selfProfile || savingProfile || !profileName.trim() || !profileLocation.trim()}
            >
              {savingProfile
                ? <ActivityIndicator color={PRIMARY} />
                : <Text style={styles.profileActionText}>Save profile</Text>}
            </TouchableOpacity>

            {authError ? <Text style={styles.authError}>{authError}</Text> : null}

            <TouchableOpacity
              style={[styles.profileAction, signingOut && styles.btnDisabled]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut
                ? <ActivityIndicator color={PRIMARY} />
                : <Text style={styles.profileActionText}>Sign out</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteAction} disabled>
              <Text style={styles.deleteActionText}>Delete account</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} disabled>
          <Ionicons name="chatbubble-outline" size={20} color={MUTED} />
          <Text style={styles.tabText}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('feed')}>
          <Ionicons name="albums-outline" size={20} color={activeTab === 'feed' ? PRIMARY : MUTED} />
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <Ionicons name="person-outline" size={20} color={activeTab === 'profile' ? PRIMARY : MUTED} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
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
  const budgetMin = requiredNumber(row.budget_min);
  const budgetMax = requiredNumber(row.budget_max);
  const partnerStaysOver = requiredScore(row.partner_stays_over);
  const okWithPartnersStaying = requiredScore(row.ok_with_partners_staying);
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
  const cohabitationToleranceScore = requiredScore(row.cohabitation_tolerance_score);

  if (
    budgetMin === null
    || budgetMax === null
    || partnerStaysOver === null
    || okWithPartnersStaying === null
    || !isIsoDate(row.move_in_date)
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
    partnerStaysOver,
    okWithPartnersStaying,
    studyOrWfh: optionalBoolean(row.study_or_wfh, false),
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
    cohabitationToleranceScore,
  };
}

function toRankedProfile(
  participant: MatchParticipant,
  profile: ProfileRecord,
  preferences: PreferenceRecord,
  ranking: {
    score: number;
    passedFilters: boolean;
    failures: string[];
    domains: Record<DomainKey, number>;
  },
): RankedMatch {
  return {
    userId: participant.userId,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    location: profile.location,
    age: participant.age,
    gender: participant.gender,
    budgetMin: preferences.budget_min ?? 0,
    budgetMax: preferences.budget_max ?? 0,
    moveInDate: preferences.move_in_date ?? '',
    ...ranking,
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

function formatGender(gender: Gender): string {
  if (gender === 'man') return 'Man';
  if (gender === 'woman') return 'Woman';
  return 'Gender not shown';
}

function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

function formatPercent(value: number): number {
  return Math.round(value * 100);
}

function displayName(match: RankedMatch): string {
  return match.fullName?.trim() || `User ${shortUserId(match.userId)}`;
}

function displayInitial(match: RankedMatch): string {
  return displayName(match).charAt(0).toUpperCase();
}

function displayProfileName(profile: ProfileRecord): string {
  return profile.full_name?.trim() || `User ${shortUserId(profile.id)}`;
}

function displayProfileInitial(profile: ProfileRecord): string {
  return displayProfileName(profile).charAt(0).toUpperCase();
}

function formatBudget(min: number, max: number): string {
  if (!min || !max) return 'Budget not shown';
  return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

function formatDate(value: string): string {
  if (!isIsoDate(value)) return 'Date not shown';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatProfileMeta(match: RankedMatch): string {
  return [
    formatGender(match.gender),
    `${match.age}`,
    match.location?.trim() || null,
  ].filter(Boolean).join(' - ');
}

function formatSelfProfileMeta(profile: ProfileRecord): string {
  const age = calculateAge(profile.birthdate);
  return [
    formatGender(normalizeGender(profile.gender)),
    age ? `${age}` : null,
    profile.location?.trim() || null,
  ].filter(Boolean).join(' - ');
}

function topDomainSummary(domains: Record<DomainKey, number>): string {
  return Object.entries(domains)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2)
    .map(([domain, value]) => `${DOMAIN_LABELS[domain as DomainKey]} ${formatPercent(value)}%`)
    .join(' - ');
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  root: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 116,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  logo: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
  screenTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },
  iconTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#D8E6F5',
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  iconText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  matchName: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  matchMeta: {
    color: MUTED,
    fontSize: 14,
    marginTop: 4,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#EEF3FA',
    borderWidth: 1,
    borderColor: '#E1E7F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    borderRadius: 66,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    color: PRIMARY,
    fontSize: 72,
    fontWeight: '800',
  },
  infoStack: {
    gap: 12,
    paddingBottom: 10,
  },
  infoLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  infoValue: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  roundAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  rejectAction: {
    backgroundColor: '#FEEDEB',
    borderColor: '#FAD4D0',
  },
  acceptAction: {
    backgroundColor: '#ECFDF3',
    borderColor: '#B7E4C7',
  },
  scorePill: {
    backgroundColor: '#EAF4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filteredPill: {
    backgroundColor: '#FFF2E5',
  },
  scoreText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },
  filteredText: {
    color: '#B54708',
  },
  feedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  feedMetaText: {
    flex: 1,
    color: MUTED,
    fontSize: 13,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#CFE0F3',
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
  errorBanner: {
    color: '#B42318',
    backgroundColor: '#FEEDEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    fontSize: 13,
  },
  stateCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    alignItems: 'center',
    paddingVertical: 38,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 14,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  profileTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#E4EAF2',
  },
  profileSummary: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarLarge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    borderColor: '#D8E6F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  photoEditBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: CARD,
  },
  avatarInitial: {
    color: PRIMARY,
    fontSize: 44,
    fontWeight: '800',
  },
  profileName: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '800',
  },
  profileMeta: {
    color: MUTED,
    fontSize: 14,
    marginTop: 5,
  },
  profileSection: {
    marginBottom: 22,
  },
  profileLabel: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  profileInput: {
    borderWidth: 1,
    borderColor: '#D8E6F5',
    borderRadius: 12,
    backgroundColor: CARD,
    color: TEXT,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bioInput: {
    minHeight: 112,
  },
  successText: {
    color: '#067647',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  profileBody: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  authError: {
    color: '#B42318',
    textAlign: 'center',
    marginBottom: 12,
  },
  profileAction: {
    borderWidth: 1,
    borderColor: '#D8E6F5',
    backgroundColor: CARD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  profileActionText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteAction: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: '#E4EAF2',
    paddingTop: 10,
    paddingBottom: 28,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: PRIMARY,
  },
  iconTextBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  iconTextActive: {
    color: CARD,
  },
  filterPanel: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    padding: 16,
    gap: 10,
    marginBottom: 14,
  },
  filterSectionLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#D8E6F5',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterPillText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: CARD,
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageRangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8E6F5',
    borderRadius: 10,
    backgroundColor: '#F9FBFD',
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  ageRangeSep: {
    color: MUTED,
    fontSize: 16,
    fontWeight: '700',
  },
});
