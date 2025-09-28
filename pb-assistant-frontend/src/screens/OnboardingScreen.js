import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import { useAppContext } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import { updateCurrentUser } from '../services/api/user';

const REQUIRED_FIELDS = ['heightCm', 'weightKg', 'weeklyTrainingDays'];

const GENDER_OPTIONS = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'nonbinary', label: 'Non-binary' },
  { key: 'prefer_not', label: 'Prefer not to say' },
];

const HOURS = Array.from({ length: 25 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES_SECONDS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const secondsToParts = (value) => {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return { hours: '00', minutes: '00', seconds: '00' };
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(Math.min(hours, HOURS.length - 1)).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
};

const partsToSeconds = (value = {}) => {
  const { hours = '00', minutes = '00', seconds = '00' } = value;
  const h = Number(hours);
  const m = Number(minutes);
  const s = Number(seconds);

  if (![h, m, s].every(Number.isFinite)) {
    return 0;
  }

  return h * 3600 + m * 60 + s;
};

const OnboardingScreen = () => {
  const { user, authToken, updateUser } = useAppContext();
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialBestRaceTime = secondsToParts(user?.bestRaceTimeSeconds);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    heightCm: user?.heightCm ? String(user.heightCm) : '',
    weightKg: user?.weightKg ? String(user.weightKg) : '',
    weeklyTrainingDays: user?.weeklyTrainingDays ? String(user.weeklyTrainingDays) : '',
    gender: user?.gender || '',
    bestRaceDistance: user?.bestRaceDistance || '',
    bestRaceTime: initialBestRaceTime,
    timezone: user?.timezone || '',
  });

  const steps = useMemo(
    () => [
      {
        key: 'body',
        title: 'Body Metrics',
        description: 'We will use these to personalize pacing and effort guidance.',
        content: (
          <View style={styles.fieldGroup}>
            <Field
              label="Preferred name"
              placeholder="e.g. Alex"
              value={form.displayName}
              onChangeText={(text) => setForm((prev) => ({ ...prev, displayName: text }))}
            />
            <GenderSelector
              value={form.gender}
              onSelect={(value) => setForm((prev) => ({ ...prev, gender: value }))}
            />
            <Field
              label="Height (cm)"
              placeholder="175"
              keyboardType="numeric"
              value={form.heightCm}
              onChangeText={(text) => setForm((prev) => ({ ...prev, heightCm: text }))}
              required
            />
            <Field
              label="Weight (kg)"
              placeholder="68"
              keyboardType="numeric"
              value={form.weightKg}
              onChangeText={(text) => setForm((prev) => ({ ...prev, weightKg: text }))}
              required
            />
          </View>
        ),
      },
      {
        key: 'running',
        title: 'Running Fitness',
        description: 'Help us estimate training load based on your recent performances.',
        content: (
          <View style={styles.fieldGroup}>
            <Field
              label="Best race distance"
              placeholder="Half Marathon"
              value={form.bestRaceDistance}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, bestRaceDistance: text }))
              }
            />
            <TimePickerField
              label="Best race time"
              value={form.bestRaceTime}
              onChange={(nextValue) =>
                setForm((prev) => ({ ...prev, bestRaceTime: nextValue }))
              }
            />
          </View>
        ),
      },
      {
        key: 'availability',
        title: 'Training Availability',
        description: 'Tell us how many days per week you can commit to training.',
        content: (
          <View style={styles.fieldGroup}>
            <Field
              label="Training days per week"
              placeholder="4"
              keyboardType="numeric"
              value={form.weeklyTrainingDays}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, weeklyTrainingDays: text }))
              }
              required
            />
            <Field
              label="Timezone"
              placeholder="e.g. Asia/Shanghai"
              value={form.timezone}
              onChangeText={(text) => setForm((prev) => ({ ...prev, timezone: text }))}
            />
          </View>
        ),
      },
    ],
    [form],
  );

  const currentStep = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;

  const handleBack = () => {
    if (stepIndex === 0 || isSubmitting) return;
    setError(null);
    setStepIndex(stepIndex - 1);
  };

  const handleNext = async () => {
    if (isSubmitting) return;

    setError(null);

    if (isFinalStep) {
      const missingField = REQUIRED_FIELDS.find((field) => !form[field]);
      if (missingField) {
        setError('Please complete all required fields before continuing.');
        return;
      }

      try {
        setIsSubmitting(true);
        const payload = {
          displayName: form.displayName?.trim() || undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          weeklyTrainingDays: form.weeklyTrainingDays
            ? Number(form.weeklyTrainingDays)
            : undefined,
          bestRaceDistance: form.bestRaceDistance?.trim() || undefined,
          bestRaceTimeSeconds: (() => {
            const totalSeconds = partsToSeconds(form.bestRaceTime);
            return totalSeconds > 0 ? totalSeconds : undefined;
          })(),
          timezone: form.timezone?.trim() || undefined,
          gender: form.gender || undefined,
        };

        const updatedUser = await updateCurrentUser(authToken, payload);
        updateUser(updatedUser);
      } catch (submitError) {
        setError(submitError.message);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setStepIndex(stepIndex + 1);
  };

  return (
    <ScreenContainer style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.progressText}>{`Step ${stepIndex + 1} of ${steps.length}`}</Text>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.description}>{currentStep.description}</Text>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${((stepIndex + 1) / steps.length) * 100}%`,
                    backgroundColor: theme.palette.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.card}>{currentStep.content}</View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.secondaryButton, (stepIndex === 0 || isSubmitting) && styles.secondaryButtonDisabled]}
            onPress={handleBack}
            disabled={stepIndex === 0 || isSubmitting}
          >
            <Text style={styles.secondaryButtonLabel}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.palette.primary }]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting && isFinalStep ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonLabel}>{isFinalStep ? 'Finish' : 'Next'}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const Field = ({ label, required, containerStyle, ...inputProps }) => (
  <View style={[styles.field, containerStyle]}>
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
    <TextInput style={styles.input} {...inputProps} />
  </View>
);

const TimePickerField = ({ label, value, onChange }) => {
  const safeValue = value || { hours: '00', minutes: '00', seconds: '00' };
  const handleChange = (part) => (newValue) => {
    onChange({
      ...safeValue,
      [part]: String(newValue).padStart(2, '0'),
    });
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.timePickerRow}>
        <TimePickerColumn
          label="HH"
          options={HOURS}
          selectedValue={safeValue.hours}
          onValueChange={handleChange('hours')}
        />
        <Text style={styles.timePickerSeparator}>:</Text>
        <TimePickerColumn
          label="MM"
          options={MINUTES_SECONDS}
          selectedValue={safeValue.minutes}
          onValueChange={handleChange('minutes')}
        />
        <Text style={styles.timePickerSeparator}>:</Text>
        <TimePickerColumn
          label="SS"
          options={MINUTES_SECONDS}
          selectedValue={safeValue.seconds}
          onValueChange={handleChange('seconds')}
        />
      </View>
    </View>
  );
};

const TimePickerColumn = ({ label, options, selectedValue, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onValueChange(option);
    setIsOpen(false);
  };

  return (
    <View style={styles.timePickerColumn}>
      <Text style={styles.timePickerLabel}>{label}</Text>
      <Pressable
        style={styles.dropdownTrigger}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.dropdownValue}>{selectedValue}</Text>
        <Text style={styles.dropdownIcon}>v</Text>
      </Pressable>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsOpen(false)} />
          <View style={styles.modalContent}>
            <ScrollView>
              {options.map((option) => {
                const active = option === selectedValue;
                return (
                  <Pressable
                    key={option}
                    style={[styles.modalOption, active && styles.modalOptionSelected]}
                    onPress={() => handleSelect(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.modalOptionText, active && styles.modalOptionTextSelected]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const GenderSelector = ({ value, onSelect }) => (
  <View style={styles.genderContainer}>
    <Text style={styles.fieldLabel}>Gender</Text>
    <View style={styles.genderOptions}>
      {GENDER_OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <Pressable
            key={option.key}
            style={[styles.genderOption, active && styles.genderOptionActive]}
            onPress={() => onSelect(option.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.genderRadioOuter, active && styles.genderRadioOuterActive]}>
              {active ? <View style={styles.genderRadioInner} /> : null}
            </View>
            <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: {
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 16,
    color: '#475569',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  fieldGroup: {
    gap: 16,
  },
  genderContainer: {
    gap: 10,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
  },
  genderOptionActive: {
    borderColor: '#0f6cbd',
    backgroundColor: '#e0f2fe',
  },
  genderRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderRadioOuterActive: {
    borderColor: '#0f6cbd',
  },
  genderRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f6cbd',
  },
  genderLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  genderLabelActive: {
    color: '#0f172a',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    backgroundColor: '#f8fafc',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },
  timePickerSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '70%',
    paddingVertical: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalOptionSelected: {
    backgroundColor: '#e0f2fe',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
