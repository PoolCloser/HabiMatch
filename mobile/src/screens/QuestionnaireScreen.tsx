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

type AnswerKey =
  | 'smokes' | 'ok_with_smoking'
  | 'uses_marijuana' | 'ok_with_marijuana'
  | 'drinks_alcohol' | 'ok_with_alcohol'
  | 'has_pets' | 'ok_with_pets'
  | 'partner_stays_over' | 'ok_with_partners_staying'
  | 'study_or_wfh' | 'budget_min' | 'budget_max' | 'move_in'
  | 'sleep_behavior_score' | 'sleep_tolerance_score'
  | 'clean_behavior_score' | 'clean_tolerance_score' | 'cooking_behavior_score' | 'cooking_tolerance_score'
  | 'noise_behavior_score' | 'noise_tolerance_score'
  | 'guest_behavior_score' | 'guest_tolerance_score'
  | 'conflict_behavior_score' | 'conflict_tolerance_score'
  | 'cohabitation_tolerance_score';

type Answers = Record<AnswerKey, string>;

type OptionsStep = {
  type?: 'options';
  category: string;
  question: string;
  field: AnswerKey;
  options: { label: string; value: string }[];
};

type BudgetStep = {
  type: 'budget_range';
  category: string;
  question: string;
};

type TimePickerStep = {
  type: 'time_picker';
  category: string;
  question: string;
  field: AnswerKey;
};

type Step = OptionsStep | BudgetStep | TimePickerStep;

const YES_NO = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

// If the user does this behavior themselves, skip the tolerance question and auto-set it to 'yes'.
const SKIP_IF_YES: Partial<Record<AnswerKey, AnswerKey>> = {
  smokes: 'ok_with_smoking',
  uses_marijuana: 'ok_with_marijuana',
  drinks_alcohol: 'ok_with_alcohol',
};

const STEPS: Step[] = [
  // Logistics filters first — hard mismatches caught before anything else.
  { type: 'budget_range', category: 'Logistics', question: "What's your monthly rent budget?" },
  {
    category: 'Logistics',
    question: 'When are you looking to move in?',
    field: 'move_in',
    options: [
      { label: 'Within 1 month', value: '1mo' },
      { label: '1-3 months', value: '3mo' },
      { label: '3-6 months', value: '6mo' },
      { label: '6+ months', value: '6plus' },
    ],
  },

  // Yes/no dealbreakers.
  { category: 'Lifestyle', question: 'Do you smoke cigarettes?', field: 'smokes', options: YES_NO },
  { category: 'Lifestyle', question: 'Are you OK living with a smoker?', field: 'ok_with_smoking', options: YES_NO },
  { category: 'Lifestyle', question: 'Do you use marijuana?', field: 'uses_marijuana', options: YES_NO },
  { category: 'Lifestyle', question: 'Are you OK living with someone who uses marijuana?', field: 'ok_with_marijuana', options: YES_NO },
  { category: 'Lifestyle', question: 'Do you drink alcohol at home?', field: 'drinks_alcohol', options: YES_NO },
  { category: 'Lifestyle', question: 'Are you OK living with someone who drinks at home?', field: 'ok_with_alcohol', options: YES_NO },
  { category: 'Home Life', question: 'Do you have pets?', field: 'has_pets', options: YES_NO },
  { category: 'Home Life', question: 'Is it OK if a housemate has pets?', field: 'ok_with_pets', options: YES_NO },

  // Sleep — grouped with WFH and noise since they're all about schedule and environment.
  {
    type: 'time_picker',
    category: 'Sleep & Schedule',
    question: 'What time do you usually fall asleep on a weeknight?',
    field: 'sleep_behavior_score',
  },
  {
    category: 'Sleep & Schedule',
    question: 'How bothered are you if a roommate is making noise at 1am?',
    field: 'sleep_tolerance_score',
    options: [
      { label: "Very bothered - I can't sleep through it", value: '0' },
      { label: "Bothered - I'd need to ask them to stop", value: '1' },
      { label: "It'd wake me but I could usually get back to sleep", value: '2' },
      { label: 'Slightly bothered but manageable', value: '3' },
      { label: "Not bothered at all", value: '4' },
    ],
  },
  { category: 'Logistics', question: 'Do you work or study from home regularly?', field: 'study_or_wfh', options: YES_NO },
  {
    category: 'Noise & Environment',
    question: "What's your apartment usually like on a Saturday afternoon?",
    field: 'noise_behavior_score',
    options: [
      { label: 'Very quiet - reading, working, or resting', value: '0' },
      { label: 'Low-key - maybe some background music', value: '1' },
      { label: 'Active - TV or music on, some movement', value: '2' },
      { label: 'Lively - often have people over or gaming', value: '3' },
      { label: 'Loud - music up, lots going on', value: '4' },
    ],
  },
  {
    category: 'Noise & Environment',
    question: 'Your roommate is playing music while you try to focus. How do you feel?',
    field: 'noise_tolerance_score',
    options: [
      { label: 'Very bothered - I need near-silence to focus', value: '0' },
      { label: "Bothered - I'd need to ask them to turn it down", value: '1' },
      { label: "Slightly annoyed - I'd put on headphones", value: '2' },
      { label: 'Barely bothered - I can tune it out', value: '3' },
      { label: 'Not bothered at all', value: '4' },
    ],
  },

  // Guests — scored questions first, then the hard yes/no filters.
  {
    category: 'Guests & Social',
    question: 'How often do you have people over in a typical month?',
    field: 'guest_behavior_score',
    options: [
      { label: 'Rarely or never', value: '0' },
      { label: 'A few times (2-4)', value: '1' },
      { label: 'About once a week', value: '2' },
      { label: 'Several times a week', value: '3' },
      { label: 'Almost daily', value: '4' },
    ],
  },
  {
    category: 'Guests & Social',
    question: 'Your roommate has people over 3-4 nights a week. How do you feel?',
    field: 'guest_tolerance_score',
    options: [
      { label: "Very uncomfortable - that's too much for me", value: '0' },
      { label: 'Could manage occasionally but not regularly', value: '1' },
      { label: 'OK with it as long as I still get quiet nights', value: '2' },
      { label: 'That seems pretty normal to me', value: '3' },
      { label: 'No problem at all', value: '4' },
    ],
  },
  {
    category: 'Home Life',
    question: 'How often do you have overnight guests?',
    field: 'partner_stays_over',
    options: [
      { label: 'Never or almost never', value: '0' },
      { label: 'A few times a year', value: '1' },
      { label: 'Once or twice a month', value: '2' },
      { label: 'About once a week', value: '3' },
      { label: 'Several times a week or more', value: '4' },
    ],
  },
  {
    category: 'Home Life',
    question: 'How often would you be OK with a roommate having overnight guests?',
    field: 'ok_with_partners_staying',
    options: [
      { label: "Never - I'd really prefer they don't", value: '0' },
      { label: 'Rarely - a few times a year is fine', value: '1' },
      { label: 'Occasionally - once or twice a month is fine', value: '2' },
      { label: 'Regularly - about once a week is fine', value: '3' },
      { label: 'As often as they like', value: '4' },
    ],
  },

  // Cleanliness and cooking.
  {
    category: 'Cleanliness',
    question: 'In the last month, how often did you clean shared spaces?',
    field: 'clean_behavior_score',
    options: [
      { label: 'Daily, or right after I use something', value: '0' },
      { label: 'A few times a week', value: '1' },
      { label: 'About once a week', value: '2' },
      { label: 'Every few weeks', value: '3' },
      { label: 'Rarely - only when it gets really bad', value: '4' },
    ],
  },
  {
    category: 'Cleanliness',
    question: 'Dishes have been sitting in the sink for three days. What do you do?',
    field: 'clean_tolerance_score',
    options: [
      { label: "I'd say something immediately", value: '0' },
      { label: "I'd mention it after a day or two", value: '1' },
      { label: "I'd clean them myself and bring it up later", value: '2' },
      { label: "I'd clean them myself and let it go", value: '3' },
      { label: "Doesn't bother me - I'd leave them too", value: '4' },
    ],
  },
  {
    category: 'Cleanliness',
    question: 'How often do you cook at home?',
    field: 'cooking_behavior_score',
    options: [
      { label: 'Never or almost never - I eat out or order in', value: '0' },
      { label: 'A few times a month', value: '1' },
      { label: 'A few times a week', value: '2' },
      { label: 'Most nights', value: '3' },
      { label: 'Daily, including big meals or meal prepping', value: '4' },
    ],
  },
  {
    category: 'Cleanliness',
    question: 'How do you feel about a roommate who cooks frequently?',
    field: 'cooking_tolerance_score',
    options: [
      { label: "I'd prefer they rarely cook - smells and mess bother me", value: '0' },
      { label: 'Occasional cooking is fine, but not too often', value: '1' },
      { label: "I don't mind either way", value: '2' },
      { label: "I'd enjoy having a roommate who cooks regularly", value: '3' },
      { label: 'The more they cook the better', value: '4' },
    ],
  },

  // Conflict and cohabitation style last — most reflective, least likely to cause drop-off.
  {
    category: 'Conflict Style',
    question: 'Something in the apartment has been bothering you for a week. What do you do?',
    field: 'conflict_behavior_score',
    options: [
      { label: 'Keep it to myself and work around it', value: '0' },
      { label: 'Leave a note or send a text', value: '1' },
      { label: 'Bring it up casually when the moment feels right', value: '2' },
      { label: 'Have a direct but friendly conversation', value: '3' },
      { label: "Address it right away so it doesn't keep happening", value: '4' },
    ],
  },
  {
    category: 'Conflict Style',
    question: 'If you were doing something that bothered your roommate, how would you want them to handle it?',
    field: 'conflict_tolerance_score',
    options: [
      { label: 'Handle it without making it a thing', value: '0' },
      { label: 'A text or note is fine', value: '1' },
      { label: 'Bring it up whenever - no pressure', value: '2' },
      { label: 'Talk to me directly', value: '3' },
      { label: 'Tell me immediately and directly', value: '4' },
    ],
  },
  {
    category: 'Cohabitation Style',
    question: 'Ideally, how much would you like to interact with a roommate at home?',
    field: 'cohabitation_tolerance_score',
    options: [
      { label: 'Very little - I value my own space and independence', value: '0' },
      { label: 'Minimal - polite but mostly independent', value: '1' },
      { label: "Some - casual interaction is nice but I don't need more", value: '2' },
      { label: "Regular - I'd enjoy someone to hang out with at home", value: '3' },
      { label: 'A lot - I want a roommate I can genuinely spend time with', value: '4' },
    ],
  },
];

const MOVE_IN_DAYS: Record<string, number> = {
  '1mo': 30,
  '3mo': 90,
  '6mo': 180,
  '6plus': 365,
};

const timeToScore = (date: Date): number => {
  const h = date.getHours();
  if (h >= 5 && h < 22) return 0;
  if (h === 22) return 1;
  if (h === 23) return 2;
  if (h === 0) return 3;
  return 4;
};

const defaultBedtime = new Date();
defaultBedtime.setHours(23, 0, 0, 0);

const EMPTY_ANSWERS: Answers = {
  ...Object.fromEntries(
    STEPS
      .filter((s): s is OptionsStep =>
        s.type !== 'budget_range' && s.type !== 'time_picker',
      )
      .map(s => [s.field, '']),
  ),
  sleep_behavior_score: String(timeToScore(defaultBedtime)),
  budget_min: '',
  budget_max: '',
} as Answers;

const describeSaveError = (saveError: unknown): string => {
  if (saveError instanceof Error) {
    return saveError.message;
  }

  if (saveError && typeof saveError === 'object') {
    const message =
      'message' in saveError && typeof saveError.message === 'string'
        ? saveError.message
        : '';
    const details =
      'details' in saveError && typeof saveError.details === 'string' && saveError.details
        ? saveError.details
        : '';
    const code =
      'code' in saveError && typeof saveError.code === 'string' && saveError.code
        ? ` (${saveError.code})`
        : '';

    if (message && details) return `${message}${code}. ${details}`;
    if (message) return `${message}${code}`;
  }

  return 'Unknown save error.';
};

export default function QuestionnaireScreen({ userId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timePickerDate, setTimePickerDate] = useState(defaultBedtime);

  const skippedFields = new Set(
    (Object.entries(SKIP_IF_YES) as [AnswerKey, AnswerKey][])
      .filter(([behaviorField]) => answers[behaviorField] === 'yes')
      .map(([, toleranceField]) => toleranceField),
  );

  const effectiveSteps = STEPS.filter(
    s =>
      s.type === 'budget_range' ||
      s.type === 'time_picker' ||
      !skippedFields.has((s as OptionsStep).field),
  );

  const current = effectiveSteps[step];
  const isBudgetStep = current.type === 'budget_range';
  const isTimePickerStep = current.type === 'time_picker';
  const budgetValid =
    answers.budget_min !== '' &&
    answers.budget_max !== '' &&
    Number(answers.budget_max) >= Number(answers.budget_min);
  const isComplete = isBudgetStep
    ? budgetValid
    : isTimePickerStep
      ? true
      : Boolean(answers[(current as OptionsStep).field]);

  const handleTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    setTimePickerDate(date);
    setAnswers(prev => ({ ...prev, sleep_behavior_score: String(timeToScore(date)) }));
  };

  const progressPct = ((step + 1) / effectiveSteps.length) * 100;
  const isLast = step === effectiveSteps.length - 1;

  const handleSelect = (value: string) => {
    const field = (current as OptionsStep).field;
    const updates: Partial<Answers> = { [field]: value };
    const toleranceField = SKIP_IF_YES[field];
    if (toleranceField) {
      updates[toleranceField] = value === 'yes' ? 'yes' : '';
    }
    setAnswers(prev => ({ ...prev, ...updates }));
  };

  const handleNext = async () => {
    if (!isComplete) return;
    if (!isLast) {
      setStep(s => s + 1);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const yesNo = (k: AnswerKey) => answers[k] === 'yes';
      const score = (k: AnswerKey) => parseInt(answers[k], 10);
      const moveInDate = new Date();
      moveInDate.setDate(moveInDate.getDate() + (MOVE_IN_DAYS[answers.move_in] ?? 90));

      const payload = {
        user_id: userId,
        smokes: yesNo('smokes'),
        ok_with_smoking: yesNo('ok_with_smoking'),
        uses_marijuana: yesNo('uses_marijuana'),
        ok_with_marijuana: yesNo('ok_with_marijuana'),
        drinks_alcohol: yesNo('drinks_alcohol'),
        ok_with_alcohol: yesNo('ok_with_alcohol'),
        has_pets: yesNo('has_pets'),
        ok_with_pets: yesNo('ok_with_pets'),
        partner_stays_over: score('partner_stays_over'),
        ok_with_partners_staying: score('ok_with_partners_staying'),
        study_or_wfh: yesNo('study_or_wfh'),
        budget_min: parseInt(answers.budget_min, 10),
        budget_max: parseInt(answers.budget_max, 10),
        move_in_date: moveInDate.toISOString().split('T')[0],
        sleep_behavior_score: score('sleep_behavior_score'),
        sleep_tolerance_score: score('sleep_tolerance_score'),
        clean_behavior_score: score('clean_behavior_score'),
        clean_tolerance_score: score('clean_tolerance_score'),
        cooking_behavior_score: score('cooking_behavior_score'),
        cooking_tolerance_score: score('cooking_tolerance_score'),
        noise_behavior_score: score('noise_behavior_score'),
        noise_tolerance_score: score('noise_tolerance_score'),
        guest_behavior_score: score('guest_behavior_score'),
        guest_tolerance_score: score('guest_tolerance_score'),
        conflict_behavior_score: score('conflict_behavior_score'),
        conflict_tolerance_score: score('conflict_tolerance_score'),
        cohabitation_tolerance_score: score('cohabitation_tolerance_score'),
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: existingError } = await supabase
        .from('lifestyle_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) throw existingError;

      const { error: prefError } = existing
        ? await supabase.from('lifestyle_preferences').update(payload).eq('user_id', userId)
        : await supabase.from('lifestyle_preferences').insert(payload);

      if (prefError) throw prefError;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, questionnaire_complete: true, updated_at: new Date().toISOString() },
          { onConflict: 'id' },
        );

      if (profileError) throw profileError;

      onComplete();
    } catch (saveError) {
      setError(`Could not save your answers. ${describeSaveError(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const selected = !isBudgetStep ? answers[(current as OptionsStep).field] : '';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.logo}>HabiMatch</Text>
          <Text style={styles.tagline}>Help us find your perfect match</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.category}>{current.category}</Text>
          <Text style={styles.question}>{current.question}</Text>

          {isTimePickerStep ? (
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              style={styles.timePicker}
            />
          ) : isBudgetStep ? (
            <View style={styles.budgetRow}>
              <View style={styles.budgetField}>
                <Text style={styles.budgetLabel}>Minimum</Text>
                <View style={styles.budgetInputWrap}>
                  <Text style={styles.budgetDollar}>$</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="number-pad"
                    value={answers.budget_min}
                    onChangeText={v =>
                      setAnswers(prev => ({ ...prev, budget_min: v.replace(/[^0-9]/g, '') }))
                    }
                    placeholder="0"
                    maxLength={6}
                  />
                </View>
              </View>
              <Text style={styles.budgetSep}>-</Text>
              <View style={styles.budgetField}>
                <Text style={styles.budgetLabel}>Maximum</Text>
                <View style={styles.budgetInputWrap}>
                  <Text style={styles.budgetDollar}>$</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="number-pad"
                    value={answers.budget_max}
                    onChangeText={v =>
                      setAnswers(prev => ({ ...prev, budget_max: v.replace(/[^0-9]/g, '') }))
                    }
                    placeholder="0"
                    maxLength={6}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.options}>
              {(current as OptionsStep).options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.option, selected === opt.value && styles.optionSelected]}
                  onPress={() => handleSelect(opt.value)}
                  disabled={saving}
                >
                  <Text style={[styles.optionText, selected === opt.value && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.nav}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(s => s - 1)}
                disabled={saving}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, (!isComplete || saving) && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!isComplete || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>{isLast ? 'Finish' : 'Next'}</Text>
              )}
            </TouchableOpacity>
          </View>
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
  progressTrack: {
    height: 6,
    backgroundColor: '#E1E7F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 3,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  question: { fontSize: 20, fontWeight: '700', color: '#111', lineHeight: 28, marginBottom: 24 },
  options: { gap: 10 },
  option: {
    borderWidth: 2,
    borderColor: '#E1E7F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FCFDFF',
  },
  optionSelected: { borderColor: PRIMARY, backgroundColor: '#EDF4FC' },
  optionText: { fontSize: 15, color: '#444' },
  optionTextSelected: { color: PRIMARY, fontWeight: '600' },
  timePicker: { width: '100%' },
  budgetRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  budgetField: { flex: 1 },
  budgetLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  budgetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E1E7F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FCFDFF',
  },
  budgetDollar: { fontSize: 16, color: '#888', marginRight: 4 },
  budgetInput: { flex: 1, fontSize: 16, color: '#111' },
  budgetSep: { fontSize: 20, color: '#999', paddingBottom: 14 },
  error: {
    color: '#d32f2f',
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  nav: { flexDirection: 'row', marginTop: 24, gap: 12 },
  backBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E1E7F0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  nextBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
