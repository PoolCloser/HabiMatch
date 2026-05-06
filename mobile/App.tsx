import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BasicInfoScreen from './src/screens/BasicInfoScreen';
import ProfilePhotoScreen from './src/screens/ProfilePhotoScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import { supabase, isSupabaseConfigured } from './src/lib/supabase';

export type Screen = 'Login' | 'Register';

type ProfileRecord = {
  avatar_url: string | null;
  birthdate: string | null;
  full_name: string | null;
  location: string | null;
  questionnaire_complete: boolean | null;
};

type OnboardingState = {
  needsBasicInfo: boolean;
  needsPhotoSetup: boolean;
  needsQuestionnaire: boolean;
};

const createEmptyOnboardingState = (): OnboardingState => ({
  needsBasicInfo: false,
  needsPhotoSetup: false,
  needsQuestionnaire: false,
});

const NETWORK_ERROR_MESSAGES = [
  'failed to fetch',
  'load failed',
  'network error',
  'network request failed',
  'networkerror',
  'request timed out',
  'timeout',
];

const INVALID_SESSION_MESSAGES = [
  'invalid jwt',
  'invalid refresh token',
  'jwt expired',
  'refresh token not found',
  'session from session_id claim in jwt does not exist',
  'session not found',
  'user from sub claim in jwt does not exist',
  'user not found',
];

const includesAnyMessage = (message: string, fragments: string[]) =>
  fragments.some(fragment => message.includes(fragment));

const isNetworkError = (error: { message?: string | undefined } | null | undefined): boolean => {
  const message = error?.message?.toLowerCase() ?? '';
  return includesAnyMessage(message, NETWORK_ERROR_MESSAGES);
};

const isInvalidSessionError = (
  error: { message?: string | undefined; status?: number | undefined } | null | undefined,
): boolean => {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;

  const message = error.message?.toLowerCase() ?? '';
  return includesAnyMessage(message, INVALID_SESSION_MESSAGES);
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(
    createEmptyOnboardingState(),
  );
  const [screen, setScreen] = useState<Screen>('Login');
  const authRequestId = useRef(0);
  const profileRequestId = useRef(0);

  const resetOnboardingState = () => {
    setOnboardingState(createEmptyOnboardingState());
  };

  const showLoginScreen = () => {
    setScreen('Login');
  };

  const clearSignedInState = () => {
    setSession(null);
    setProfileError('');
    setProfileLoading(false);
    resetOnboardingState();
    showLoginScreen();
  };

  const clearLocalSession = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn('Failed to clear local Supabase session.', error.message);
    }
  };

  const validateSession = async (candidate: Session | null) => {
    const requestId = ++authRequestId.current;
    setAuthError('');

    if (!candidate) {
      profileRequestId.current += 1;
      clearSignedInState();
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);

    const { data, error } = await supabase.auth.getUser(candidate.access_token);

    if (requestId !== authRequestId.current) {
      return;
    }

    if (error || !data.user) {
      profileRequestId.current += 1;

      if (isNetworkError(error) && !isInvalidSessionError(error)) {
        clearSignedInState();
        setAuthError('We could not verify your session. Check your connection and try again.');
        setAuthLoading(false);
        return;
      }

      await clearLocalSession();

      if (requestId !== authRequestId.current) {
        return;
      }

      clearSignedInState();
      setAuthLoading(false);
      return;
    }

    setSession(candidate);
    setAuthLoading(false);
  };

  const reloadSession = async () => {
    setAuthLoading(true);
    setAuthError('');

    const { data } = await supabase.auth.getSession();
    await validateSession(data.session);
  };

  const loadProfile = async (activeSession: Session) => {
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);
    setProfileError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, birthdate, full_name, location, questionnaire_complete')
        .eq('id', activeSession.user.id)
        .maybeSingle<ProfileRecord>();

      if (requestId !== profileRequestId.current) {
        return;
      }

      if (error) {
        setProfileError(
          isNetworkError(error)
            ? 'We could not load your onboarding status. Check your connection and try again.'
            : 'We could not load your onboarding status. Please try again.',
        );
        resetOnboardingState();
        return;
      }

      setOnboardingState({
        needsBasicInfo: !data?.birthdate || !data?.full_name?.trim() || !data?.location?.trim(),
        needsPhotoSetup: !data?.avatar_url,
        needsQuestionnaire: !data?.questionnaire_complete,
      });
    } finally {
      if (requestId === profileRequestId.current) {
        setProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    void reloadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT' || !nextSession) {
        void validateSession(null);
        return;
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'PASSWORD_RECOVERY'
      ) {
        void validateSession(nextSession);
      }
    });

    return () => {
      authRequestId.current += 1;
      profileRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      profileRequestId.current += 1;
      resetOnboardingState();
      setProfileLoading(false);
      setProfileError('');
      return;
    }

    void loadProfile(session);
  }, [session]);

  if (!isSupabaseConfigured()) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={styles.setup}>
          <Text style={styles.setupTitle}>Configure Supabase</Text>
          <Text style={styles.setupBody}>
            Create a file named .env in the mobile folder with:{'\n\n'}
            EXPO_PUBLIC_SUPABASE_URL=your-project-url{'\n'}
            EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key{'\n\n'}
            Restart Expo after saving (stop the dev server, then run npx expo start again).
          </Text>
        </View>
      </>
    );
  }

  if (authLoading || profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (authError || profileError) {
    const message = authError || profileError;
    const handleRetry = authError
      ? () => void reloadSession()
      : () => {
          if (session) {
            void loadProfile(session);
          } else {
            void reloadSession();
          }
        };

    return (
      <>
        <StatusBar style="dark" />
        <View style={styles.blockingState}>
          <Text style={styles.blockingTitle}>Session check failed</Text>
          <Text style={styles.blockingBody}>{message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (session) {
    return (
      <>
        <StatusBar style="dark" />
        {onboardingState.needsBasicInfo ? (
          <BasicInfoScreen
            userId={session.user.id}
            onComplete={() =>
              setOnboardingState(current => ({ ...current, needsBasicInfo: false }))
            }
          />
        ) : onboardingState.needsPhotoSetup ? (
          <ProfilePhotoScreen
            userId={session.user.id}
            onComplete={() =>
              setOnboardingState(current => ({ ...current, needsPhotoSetup: false }))
            }
          />
        ) : onboardingState.needsQuestionnaire ? (
          <QuestionnaireScreen
            userId={session.user.id}
            onComplete={() =>
              setOnboardingState(current => ({ ...current, needsQuestionnaire: false }))
            }
          />
        ) : (
          <HomeScreen />
        )}
      </>
    );
  }

  const navigate = (to: Screen) => setScreen(to);

  return (
    <>
      <StatusBar style="light" />
      {screen === 'Login' ? (
        <LoginScreen navigate={navigate} />
      ) : (
        <RegisterScreen navigate={navigate} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  blockingState: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  blockingTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111',
    textAlign: 'center',
  },
  blockingBody: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    alignSelf: 'center',
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  setup: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  setupTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#111' },
  setupBody: { fontSize: 15, color: '#444', lineHeight: 22 },
});
