import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../components/layout/ScreenContainer';
import { useAppContext } from '../state/AppContext';
import { createPlan } from '../services/api/plans';
import { useTheme } from '../theme/ThemeProvider';

const GoalSetupScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { authToken, setPlanData } = useAppContext();

  const [form, setForm] = useState({
    raceDistance: '',
    raceDate: '',
    targetHours: '',
    targetMinutes: '',
    targetSeconds: '',
    weeklyTrainingDays: '',
    longRunDay: '',
    availableEquipment: '',
    goalNotes: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitDisabled = useMemo(() => {
    return !form.raceDistance.trim() || !form.raceDate.trim() || submitting;
  }, [form, submitting]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const computeTargetSeconds = () => {
    const hours = Number.parseInt(form.targetHours, 10) || 0;
    const minutes = Number.parseInt(form.targetMinutes, 10) || 0;
    const seconds = Number.parseInt(form.targetSeconds, 10) || 0;
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  };

  const handleSubmit = async () => {
    if (!authToken) {
      setError('You need to be logged in to create a plan.');
      return;
    }

    const trimmedDistance = form.raceDistance.trim();
    const trimmedDate = form.raceDate.trim();

    if (!trimmedDistance || !trimmedDate) {
      setError('Please provide both race distance and date.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        raceDistance: trimmedDistance,
        raceDate: trimmedDate,
        targetFinishTimeSeconds: computeTargetSeconds(),
        goalNotes: form.goalNotes.trim() || undefined,
        weeklyTrainingDays: form.weeklyTrainingDays ? Number(form.weeklyTrainingDays) : undefined,
        longRunDay: form.longRunDay.trim() || undefined,
        availableEquipment: form.availableEquipment.trim() || undefined,
      };

      const result = await createPlan(authToken, payload);
      setPlanData(result.plan, result.workouts || []);
      navigation.reset({ index: 0, routes: [{ name: 'PlanOverview' }] });
    } catch (submitError) {
      setError(submitError.message || 'Unable to generate plan. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Set Your Goal</Text>
          <Text style={styles.subtitle}>
            Tell PB助手 about your target race so we can build a personalised training plan.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Race Details</Text>
            <Field
              label="Race Distance"
              placeholder="Marathon, Half, 10K..."
              value={form.raceDistance}
              onChangeText={(value) => handleChange('raceDistance', value)}
              required
            />
            <Field
              label="Race Date"
              placeholder="2025-04-13"
              value={form.raceDate}
              onChangeText={(value) => handleChange('raceDate', value)}
              required
            />
            <View style={styles.row}>
              <Field
                label="Target Hours"
                placeholder="3"
                value={form.targetHours}
                onChangeText={(value) => handleChange('targetHours', value)}
                keyboardType="numeric"
                containerStyle={styles.flexItem}
              />
              <Field
                label="Minutes"
                placeholder="15"
                value={form.targetMinutes}
                onChangeText={(value) => handleChange('targetMinutes', value)}
                keyboardType="numeric"
                containerStyle={styles.flexItem}
              />
              <Field
                label="Seconds"
                placeholder="0"
                value={form.targetSeconds}
                onChangeText={(value) => handleChange('targetSeconds', value)}
                keyboardType="numeric"
                containerStyle={styles.flexItem}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training Preferences</Text>
            <Field
              label="Training days per week"
              placeholder="4"
              value={form.weeklyTrainingDays}
              onChangeText={(value) => handleChange('weeklyTrainingDays', value)}
              keyboardType="numeric"
            />
            <Field
              label="Preferred long run day"
              placeholder="Sunday"
              value={form.longRunDay}
              onChangeText={(value) => handleChange('longRunDay', value)}
            />
            <Field
              label="Available equipment"
              placeholder="Treadmill, gym access..."
              value={form.availableEquipment}
              onChangeText={(value) => handleChange('availableEquipment', value)}
            />
            <Field
              label="Notes for the coach"
              placeholder="I want to focus on negative splits..."
              value={form.goalNotes}
              onChangeText={(value) => handleChange('goalNotes', value)}
              multiline
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.palette.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitLabel}>Generate Training Plan</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const Field = ({ label, required, containerStyle, ...inputProps }) => (
  <View style={[styles.fieldContainer, containerStyle]}>
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
    <TextInput
      style={[styles.input, inputProps.multiline && styles.multilineInput]}
      placeholderTextColor="#94a3b8"
      {...inputProps}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default GoalSetupScreen;
