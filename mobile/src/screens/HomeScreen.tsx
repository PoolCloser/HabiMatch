import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    setError('');
    setSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(signOutError.message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{"You're signed in"}</Text>
      <Text style={styles.subtitle}>Build your main app flow from here.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.btn, signingOut && styles.btnDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Sign out</Text>}
      </TouchableOpacity>
    </View>
  );
}

const PRIMARY = '#4A90D9';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 28 },
  error: { color: '#d32f2f', marginBottom: 16, textAlign: 'center' },
  btn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
