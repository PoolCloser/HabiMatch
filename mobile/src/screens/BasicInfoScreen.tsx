import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  onComplete: () => void;
};

const PRIMARY = '#4A90D9';
type BasicInfoStep = 'profile' | 'details';

const GENDER_OPTIONS = [
  { label: 'Man', value: 'man' },
  { label: 'Woman', value: 'woman' },
];

const isAtLeast18 = (date: Date): boolean => {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return date <= cutoff;
};

const defaultBirthdate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 22);
  return d;
})();

export default function BasicInfoScreen({ userId, onComplete }: Props) {
  const [step, setStep] = useState<BasicInfoStep>('profile');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [birthdate, setBirthdate] = useState(defaultBirthdate);
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ageError = !isAtLeast18(birthdate);
  const profileComplete = fullName.trim() !== '' && location.trim() !== '';
  const detailsComplete = !ageError && gender !== '';
  const isComplete = profileComplete && detailsComplete;

  const handleDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setBirthdate(date);
  };

  const handleSave = async () => {
    if (!isComplete) return;
    setSaving(true);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName.trim(),
          location: location.trim(),
          birthdate: birthdate.toISOString().split('T')[0],
          gender,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (dbError) throw dbError;
      onComplete();
    } catch {
      setError('Could not save your info. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.logo}>HabiMatch</Text>
          <Text style={styles.tagline}>Tell us a bit about yourself</Text>
        </View>

        <View style={styles.card}>
          {step === 'profile' ? (
            <>
              <Text style={styles.sectionLabel}>Profile</Text>
              <Text style={styles.question}>What should roommates call you?</Text>

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                editable={!saving}
                placeholder="Full name"
                placeholderTextColor="#aaa"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Text style={styles.question}>Where are you looking?</Text>

              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                editable={!saving}
                placeholder="City, state"
                placeholderTextColor="#aaa"
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[styles.continueBtn, (!profileComplete || saving) && styles.continueBtnDisabled]}
                onPress={() => setStep('details')}
                disabled={!profileComplete || saving}
              >
                <Text style={styles.continueBtnText}>Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Date of Birth</Text>
              <Text style={styles.question}>When were you born?</Text>

              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={birthdate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  style={styles.datePicker}
                />
              </View>

              {ageError && (
                <Text style={styles.ageError}>
                  You must be at least 18 years old to use HabiMatch.
                </Text>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Gender</Text>
              <Text style={styles.question}>How do you identify?</Text>

              <View style={styles.genderGrid}>
                {GENDER_OPTIONS.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.genderOption, gender === g.value && styles.genderOptionSelected]}
                    onPress={() => setGender(g.value)}
                    disabled={saving}
                  >
                    <Text style={[styles.genderText, gender === g.value && styles.genderTextSelected]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.continueBtn, (!detailsComplete || saving) && styles.continueBtnDisabled]}
                onPress={handleSave}
                disabled={!detailsComplete || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.continueBtnText}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep('profile')}
                disabled={saving}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: PRIMARY },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  question: { fontSize: 20, fontWeight: '700', color: '#111', lineHeight: 28, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  datePickerWrap: { alignItems: 'center' },
  datePicker: { width: '100%' },
  ageError: { color: '#d32f2f', fontSize: 14, textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E1E7F0', marginVertical: 24 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderOption: {
    borderWidth: 2,
    borderColor: '#E1E7F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#FCFDFF',
  },
  genderOptionSelected: { borderColor: PRIMARY, backgroundColor: '#EDF4FC' },
  genderText: { fontSize: 15, color: '#444' },
  genderTextSelected: { color: PRIMARY, fontWeight: '600' },
  errorBanner: {
    color: '#d32f2f',
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backBtnText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },
});
