import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { MainScreen } from '../types/navigation';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  navigate: (screen: MainScreen) => void;
};

function noiseToDb(v: 'low' | 'medium' | 'high' | null): number | null {
  if (!v) return null;
  return { low: 1, medium: 2, high: 3 }[v];
}

function socialToDb(v: 'quiet' | 'balanced' | 'social' | null): number | null {
  if (!v) return null;
  return { quiet: 1, balanced: 2, social: 3 }[v];
}

type Option<T extends string> = { label: string; value: T };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <View style={styles.segment}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Level({
  label,
  value,
  min = 1,
  max = 5,
  onChange,
}: {
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const options = useMemo(() => {
    const out: number[] = [];
    for (let i = min; i <= max; i += 1) out.push(i);
    return out;
  }, [min, max]);

  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <View style={styles.levelRow}>
        {options.map((n) => {
          const active = n === value;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.levelChip, active && styles.levelChipActive]}
              onPress={() => onChange(n)}
            >
              <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function QuestionnaireScreen({ userId, navigate }: Props) {
  const [sleepSchedule, setSleepSchedule] = useState<'early_bird' | 'night_owl' | null>(null);
  const [cleanlinessLevel, setCleanlinessLevel] = useState<number | null>(3);
  const [noiseTolerance, setNoiseTolerance] = useState<'low' | 'medium' | 'high' | null>('medium');
  const [socialLevel, setSocialLevel] = useState<'quiet' | 'balanced' | 'social' | null>('balanced');
  const [guestFrequency, setGuestFrequency] = useState<'rarely' | 'sometimes' | 'often' | null>('sometimes');
  const [smokingPreference, setSmokingPreference] = useState<'okay' | 'not_okay' | null>('not_okay');
  const [drinkingPreference, setDrinkingPreference] = useState<'okay' | 'not_okay' | null>('okay');
  const [petPreference, setPetPreference] = useState<'okay' | 'not_okay' | null>('not_okay');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          sleep_schedule: sleepSchedule,
          cleanliness_level: cleanlinessLevel,
          noise_tolerance: noiseToDb(noiseTolerance),
          social_level: socialToDb(socialLevel),
          guest_frequency: guestFrequency,
          smoking_preference: smokingPreference,
          drinking_preference: drinkingPreference,
          pet_preference: petPreference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      navigate('Home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about your lifestyle</Text>
          <Text style={styles.subtitle}>Your answers help us match you with compatible people.</Text>
        </View>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Segmented
            label="Sleep Schedule"
            value={sleepSchedule}
            options={[
              { label: 'Early Bird', value: 'early_bird' },
              { label: 'Night Owl', value: 'night_owl' },
            ]}
            onChange={setSleepSchedule}
          />

          <Level label="Cleanliness Level" value={cleanlinessLevel} onChange={setCleanlinessLevel} />

          <Segmented
            label="Noise Tolerance"
            value={noiseTolerance}
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ]}
            onChange={setNoiseTolerance}
          />

          <Segmented
            label="Social Level"
            value={socialLevel}
            options={[
              { label: 'Quiet', value: 'quiet' },
              { label: 'Balanced', value: 'balanced' },
              { label: 'Social', value: 'social' },
            ]}
            onChange={setSocialLevel}
          />

          <Segmented
            label="Guests Frequency"
            value={guestFrequency}
            options={[
              { label: 'Rarely', value: 'rarely' },
              { label: 'Sometimes', value: 'sometimes' },
              { label: 'Often', value: 'often' },
            ]}
            onChange={setGuestFrequency}
          />

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Segmented
                label="Smoking Preference"
                value={smokingPreference}
                options={[
                  { label: 'Okay', value: 'okay' },
                  { label: 'Not okay', value: 'not_okay' },
                ]}
                onChange={setSmokingPreference}
              />
            </View>
            <View style={styles.rowCol}>
              <Segmented
                label="Drinking Preference"
                value={drinkingPreference}
                options={[
                  { label: 'Okay', value: 'okay' },
                  { label: 'Not okay', value: 'not_okay' },
                ]}
                onChange={setDrinkingPreference}
              />
            </View>
          </View>

          <Segmented
            label="Pet Preference"
            value={petPreference}
            options={[
              { label: 'Okay', value: 'okay' },
              { label: 'Not okay', value: 'not_okay' },
            ]}
            onChange={setPetPreference}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Home')}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              onPress={() => void handleFinish()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Finish</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = '#4A90D9';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    ...(Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight ?? 0 }),
  },
  root: { flex: 1, backgroundColor: '#f4f7fb' },
  header: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#475569', lineHeight: 20 },
  errorBanner: {
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fdecea',
    color: '#c62828',
    fontSize: 14,
  },
  content: { padding: 18, paddingBottom: 28 },

  block: { marginBottom: 16 },
  blockLabel: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 10 },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#eaf2fe',
    borderRadius: 12,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: PRIMARY },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#335d9a' },
  segmentTextActive: { color: '#fff' },

  levelRow: {
    flexDirection: 'row',
    backgroundColor: '#eaf2fe',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'space-between',
  },
  levelChip: {
    width: 44,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  levelChipActive: { backgroundColor: PRIMARY },
  levelChipText: { fontSize: 13, fontWeight: '800', color: '#335d9a' },
  levelChipTextActive: { color: '#fff' },

  row: { flexDirection: 'row', gap: 12 },
  rowCol: { flex: 1 },

  footer: { flexDirection: 'row', gap: 12, marginTop: 6 },
  backBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfe3fb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: { color: PRIMARY, fontSize: 15, fontWeight: '800' },
  primaryBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
