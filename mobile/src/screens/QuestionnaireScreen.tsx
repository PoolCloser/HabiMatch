import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainScreen } from '../types/navigation';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  navigate: (screen: MainScreen) => void;
};

/**
 * DB CHECK constraints require scores in [1, 5]; conflict_style in [1, 4].
 * See lifestyle_preferences_*_check on Supabase.
 */
function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Noise UI → 1–3 (fits noise_* score columns). */
function noiseTier(v: 'low' | 'medium' | 'high' | null): number {
  if (!v) return 2;
  return { low: 1, medium: 2, high: 3 }[v];
}

/** Social → conflict_style (1–4 allowed). */
function socialToConflictStyle(v: 'quiet' | 'balanced' | 'social' | null): number {
  if (!v) return 2;
  return { quiet: 1, balanced: 2, social: 3 }[v];
}

/** Guest frequency → 1–5 */
function guestToScore(v: 'rarely' | 'sometimes' | 'often' | null): number {
  if (!v) return 3;
  return { rarely: 1, sometimes: 3, often: 5 }[v];
}

/** Sleep schedule → 1–5 */
function sleepTimeScore(v: 'early_bird' | 'night_owl' | null): number {
  if (!v) return 3;
  return v === 'early_bird' ? 2 : 4;
}

/** Cleanliness slider is already 1–5; use same for behavior + tolerance. */
function cleanlinessScores(level: number | null): { behavior: number; tolerance: number } {
  const s = clampScore(level ?? 3);
  return { behavior: s, tolerance: s };
}

function parseOptionalIsoDate(s: string): { ok: true; iso: string | null } | { ok: false; message: string } {
  const t = s.trim();
  if (!t) return { ok: true, iso: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return { ok: false, message: 'Move-in date: use YYYY-MM-DD (e.g. 2026-09-01).' };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { ok: false, message: 'That move-in date is not a valid calendar date.' };
  }
  return { ok: true, iso: t };
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
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
  const [sleepTolerance, setSleepTolerance] = useState<number | null>(3);
  const [smokes, setSmokes] = useState<'yes' | 'no'>('no');
  const [hasPets, setHasPets] = useState<'yes' | 'no'>('no');
  const [studyFromHome, setStudyFromHome] = useState<'yes' | 'no'>('no');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [moveInDateInput, setMoveInDateInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      const dateParsed = parseOptionalIsoDate(moveInDateInput);
      if (!dateParsed.ok) {
        setError(dateParsed.message);
        return;
      }

      let budgetMinNum: number | null = null;
      let budgetMaxNum: number | null = null;
      const minT = budgetMin.trim();
      const maxT = budgetMax.trim();
      if (minT || maxT) {
        if (!minT || !maxT) {
          setError('Enter both min and max monthly rent ($), or leave both empty.');
          return;
        }
        const min = parseInt(minT, 10);
        const max = parseInt(maxT, 10);
        if (Number.isNaN(min) || Number.isNaN(max)) {
          setError('Budget must be whole dollar amounts.');
          return;
        }
        if (min < 0 || max < 0) {
          setError('Budget cannot be negative.');
          return;
        }
        if (min > max) {
          setError('Minimum rent must be less than or equal to maximum.');
          return;
        }
        budgetMinNum = min;
        budgetMaxNum = max;
      }

      const noise = noiseTier(noiseTolerance);
      const clean = cleanlinessScores(cleanlinessLevel);
      const guest = guestToScore(guestFrequency);

      const row = {
        user_id: userId,
        sleep_time_score: sleepTimeScore(sleepSchedule),
        sleep_tolerance_score: clampScore(sleepTolerance ?? 3),
        clean_behavior_score: clean.behavior,
        clean_tolerance_score: clean.tolerance,
        noise_behavior_score: noise,
        noise_tolerance_score: noise,
        guest_behavior_score: guest,
        guest_tolerance_score: guest,
        conflict_style: socialToConflictStyle(socialLevel),
        smokes: smokes === 'yes',
        ok_with_smoking: smokingPreference === 'okay',
        has_pets: hasPets === 'yes',
        ok_with_pets: petPreference === 'okay',
        study_or_wfh: studyFromHome === 'yes',
        budget_min: budgetMinNum,
        budget_max: budgetMaxNum,
        move_in_date: dateParsed.iso,
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: selectError } = await supabase
        .from('lifestyle_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) {
        setError(selectError.message);
        return;
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('lifestyle_preferences')
          .update(row)
          .eq('id', existing.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from('lifestyle_preferences').insert(row);

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          questionnaire_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileErr) {
        setError(profileErr.message);
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.root}>
          <View style={styles.header}>
            <Text style={styles.title}>Tell us about your lifestyle</Text>
            <Text style={styles.subtitle}>
              Your answers help us match you with compatible people. You can skip optional fields.
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Sleep" />
            <Segmented
              label="Typical schedule"
              value={sleepSchedule}
              options={[
                { label: 'Early bird', value: 'early_bird' },
                { label: 'Night owl', value: 'night_owl' },
              ]}
              onChange={setSleepSchedule}
            />
            <Level
              label="Sleep flexibility (1 = fixed routine, 5 = very flexible)"
              value={sleepTolerance}
              onChange={setSleepTolerance}
            />

            <SectionHeader title="Home life" />
            <Level label="Cleanliness level" value={cleanlinessLevel} onChange={setCleanlinessLevel} />

            <Segmented
              label="Noise tolerance"
              value={noiseTolerance}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
              ]}
              onChange={setNoiseTolerance}
            />

            <Segmented
              label="Social energy"
              value={socialLevel}
              options={[
                { label: 'Quiet', value: 'quiet' },
                { label: 'Balanced', value: 'balanced' },
                { label: 'Social', value: 'social' },
              ]}
              onChange={setSocialLevel}
            />

            <Segmented
              label="Guests at home"
              value={guestFrequency}
              options={[
                { label: 'Rarely', value: 'rarely' },
                { label: 'Sometimes', value: 'sometimes' },
                { label: 'Often', value: 'often' },
              ]}
              onChange={setGuestFrequency}
            />

            <SectionHeader title="Habits & boundaries" />
            <View style={styles.row}>
              <View style={styles.rowCol}>
                <Segmented
                  label="Do you smoke?"
                  value={smokes}
                  options={[
                    { label: 'No', value: 'no' },
                    { label: 'Yes', value: 'yes' },
                  ]}
                  onChange={setSmokes}
                />
              </View>
              <View style={styles.rowCol}>
                <Segmented
                  label="Do you have pets?"
                  value={hasPets}
                  options={[
                    { label: 'No', value: 'no' },
                    { label: 'Yes', value: 'yes' },
                  ]}
                  onChange={setHasPets}
                />
              </View>
            </View>

            <Segmented
              label="Okay if roommate smokes?"
              value={smokingPreference}
              options={[
                { label: 'Not okay', value: 'not_okay' },
                { label: 'Okay', value: 'okay' },
              ]}
              onChange={setSmokingPreference}
            />

            <Segmented
              label="Okay if roommate has pets?"
              value={petPreference}
              options={[
                { label: 'Not okay', value: 'not_okay' },
                { label: 'Okay', value: 'okay' },
              ]}
              onChange={setPetPreference}
            />

            <View style={styles.row}>
              <View style={styles.rowCol}>
                <Segmented
                  label="Roommate drinking"
                  value={drinkingPreference}
                  options={[
                    { label: 'Not okay', value: 'not_okay' },
                    { label: 'Okay', value: 'okay' },
                  ]}
                  onChange={setDrinkingPreference}
                />
              </View>
              <View style={styles.rowCol}>
                <Segmented
                  label="Work/study from home"
                  value={studyFromHome}
                  options={[
                    { label: 'No', value: 'no' },
                    { label: 'Yes', value: 'yes' },
                  ]}
                  onChange={setStudyFromHome}
                />
              </View>
            </View>

            <SectionHeader title="Budget & move-in" />
            <Text style={styles.fieldHint}>Monthly rent range you are comfortable with (USD).</Text>
            <View style={styles.budgetRow}>
              <View style={styles.budgetCol}>
                <Text style={styles.inputLabel}>Min ($)</Text>
                <TextInput
                  style={styles.input}
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="number-pad"
                  placeholder="800"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.budgetCol}>
                <Text style={styles.inputLabel}>Max ($)</Text>
                <TextInput
                  style={styles.input}
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="number-pad"
                  placeholder="1400"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Target move-in date (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputWide]}
              value={moveInDateInput}
              onChangeText={setMoveInDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldHintSmall}>Leave blank if you have not decided yet.</Text>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#4A90D9';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
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

  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  fieldHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 18,
  },
  fieldHintSmall: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  budgetRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  budgetCol: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
  inputWide: { marginBottom: 6 },

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
