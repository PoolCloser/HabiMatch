import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import { supabase, isSupabaseConfigured } from './src/lib/supabase';

export type Screen = 'Login' | 'Register';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('Login');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (session) {
    return (
      <>
        <StatusBar style="dark" />
        <HomeScreen />
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
  setup: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  setupTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#111' },
  setupBody: { fontSize: 15, color: '#444', lineHeight: 22 },
});
