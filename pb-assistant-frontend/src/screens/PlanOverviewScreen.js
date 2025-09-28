import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenContainer from '../components/layout/ScreenContainer';
import { useAppContext } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import ConfidenceBadge from '../components/plan/ConfidenceBadge';

const PlanOverviewScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { plan, workouts, refreshPlan, planLoaded, submitWorkoutCheckin, submitWorkoutLog } =
    useAppContext();
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ sleepQuality: null, bodyFeel: null });
  const [logForm, setLogForm] = useState({ status: 'completed', difficulty: null, notes: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const resetCheckInForm = useCallback(
    (workout) => {
      setCheckInForm({
        sleepQuality: workout?.preRunSleepQuality ?? null,
        bodyFeel: workout?.preRunBodyFeel ?? null,
      });
    },
    [],
  );

  const resetLogForm = useCallback(
    (workout) => {
      setLogForm({
        status: workout?.status === 'missed' ? 'missed' : 'completed',
        difficulty: workout?.userFeedbackDifficulty ?? null,
        notes: workout?.userFeedbackNotes ?? '',
      });
    },
    [],
  );

  const openCheckIn = useCallback(
    (workout) => {
      setActiveWorkout(workout);
      resetCheckInForm(workout);
      setError(null);
      setSubmitting(false);
      setCheckInVisible(true);
    },
    [resetCheckInForm],
  );

  const openLog = useCallback(
    (workout) => {
      setActiveWorkout(workout);
      resetLogForm(workout);
      setError(null);
      setSubmitting(false);
      setLogVisible(true);
    },
    [resetLogForm],
  );

  const closeCheckIn = useCallback(() => {
    setCheckInVisible(false);
    setError(null);
    setSubmitting(false);
  }, []);

  const closeLog = useCallback(() => {
    setLogVisible(false);
    setError(null);
    setSubmitting(false);
  }, []);

  const handleSubmitCheckIn = useCallback(async () => {
    if (!activeWorkout) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitWorkoutCheckin(activeWorkout.id, {
        sleepQuality: checkInForm.sleepQuality,
        bodyFeel: checkInForm.bodyFeel,
      });
      closeCheckIn();
    } catch (err) {
      setError(err.message || 'Unable to save check-in.');
    } finally {
      setSubmitting(false);
    }
  }, [activeWorkout, checkInForm, submitWorkoutCheckin, closeCheckIn]);

  const handleSubmitLog = useCallback(async () => {
    if (!activeWorkout) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitWorkoutLog(activeWorkout.id, {
        status: logForm.status,
        difficulty: logForm.difficulty,
        notes: logForm.notes?.trim() || undefined,
      });
      closeLog();
    } catch (err) {
      setError(err.message || 'Unable to save workout log.');
    } finally {
      setSubmitting(false);
    }
  }, [activeWorkout, logForm, submitWorkoutLog, closeLog]);

  useFocusEffect(
    useCallback(() => {
      if (!planLoaded) {
        refreshPlan().catch((error) => {
          console.warn('Failed to refresh plan', error);
        });
      }
    }, [planLoaded, refreshPlan]),
  );

  if (!planLoaded) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary} />
        <Text style={styles.loadingText}>Loading your latest training plan…</Text>
      </ScreenContainer>
    );
  }

  if (!plan) {
    return (
      <ScreenContainer style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Plan Yet</Text>
        <Text style={styles.emptyCopy}>
          Set a race goal to let PB助手 craft a personalised training plan for you.
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.palette.primary }]}
          onPress={() => navigation.replace('GoalSetup')}
        >
          <Text style={styles.primaryButtonLabel}>Set a Goal</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const payload = plan.planPayload || {};
  const summary = payload.planSummary || {};
  const metadata = payload.metadata || {};

  const progressStats = useMemo(() => {
    const counts = workouts.reduce(
      (acc, workout) => {
        const status = (workout.status || 'scheduled').toLowerCase();
        if (status === 'completed') acc.completed += 1;
        else if (status === 'missed') acc.missed += 1;
        else acc.scheduled += 1;
        acc.total += 1;
        return acc;
      },
      { completed: 0, missed: 0, scheduled: 0, total: 0 },
    );

    const completionPercentage = counts.total
      ? Math.round((counts.completed / counts.total) * 100)
      : 0;

    return { ...counts, completionPercentage };
  }, [workouts]);

  const nextWorkout = useMemo(() => {
    const upcoming = workouts
      .filter((workout) => workout.status?.toLowerCase() !== 'completed')
      .filter((workout) => {
        if (!workout.scheduledDate) return false;
        const date = new Date(workout.scheduledDate);
        if (Number.isNaN(date.getTime())) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date >= now;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    return upcoming[0] || null;
  }, [workouts]);

  const groupedWeeks = useMemo(() => {
    const grouped = new Map();

    workouts.forEach((workout) => {
      const weekNumber = workout.additionalPayload?.weekNumber || 0;
      if (!grouped.has(weekNumber)) {
        grouped.set(weekNumber, {
          weekNumber,
          microcycleFocus: workout.additionalPayload?.microcycleFocus,
          workouts: [],
        });
      }
      grouped.get(weekNumber).workouts.push(workout);
    });

    return Array.from(grouped.values())
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((week) => ({
        ...week,
        workouts: week.workouts.sort((a, b) =>
          new Date(a.scheduledDate) - new Date(b.scheduledDate),
        ),
      }));
  }, [workouts]);

  const confidenceScore = summary.confidenceScore ?? plan.confidenceScore;

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.planTitle}>Training Plan</Text>
            <Text style={styles.planSubtitle}>
              {formatRaceDistance(plan.goalRaceDistance)} ・ {formatDate(plan.goalRaceDate)}
            </Text>
            <View style={styles.progressSummary}>
              <View style={styles.progressNumeric}>
                <Text style={styles.progressLabel}>Completion</Text>
                <Text style={styles.progressValue}>{progressStats.completionPercentage}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progressStats.completionPercentage, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressBreakdown}>
                <Text style={styles.progressBreakdownLabel}>Done</Text>
                <Text style={styles.progressBreakdownValue}>{progressStats.completed}</Text>
                <Text style={styles.progressBreakdownLabel}>Scheduled</Text>
                <Text style={styles.progressBreakdownValue}>{progressStats.scheduled}</Text>
                <Text style={styles.progressBreakdownLabel}>Missed</Text>
                <Text style={styles.progressBreakdownValue}>{progressStats.missed}</Text>
              </View>
            </View>
          </View>
          <ConfidenceBadge score={confidenceScore} />
        </View>

        <NextWorkoutCard workout={nextWorkout} />

        <View style={styles.summaryCard}>
          <SummaryRow label="Total weeks" value={summary.totalWeeks ?? groupedWeeks.length} />
          <SummaryRow
            label="Weekly mileage"
            value={formatMileage(summary.weeklyMileageRangeKm)}
          />
          <SummaryRow
            label="Focus areas"
            value={summary.focusAreas?.length ? summary.focusAreas.join(', ') : 'Balanced'}
          />
          {metadata.generatedAtIso ? (
            <SummaryRow label="Generated" value={formatDateTime(metadata.generatedAtIso)} />
          ) : null}
        </View>

        {groupedWeeks.map((week) => (
          <View key={week.weekNumber} style={styles.weekCard}>
            <View style={styles.weekHeader}>
              <View style={[styles.weekBadge, { backgroundColor: theme.palette.primary }]}>
                <Text style={styles.weekBadgeText}>{week.weekNumber}</Text>
              </View>
              <View style={styles.weekTextGroup}>
                <Text style={styles.weekTitle}>Week {week.weekNumber}</Text>
                {week.microcycleFocus ? (
                  <Text style={styles.weekSubtitle}>{week.microcycleFocus}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.workoutList}>
              {week.workouts.map((workout) => (
                <View
                  key={workout.id || `${workout.scheduledDate}-${workout.workoutType}`}
                  style={styles.workoutItem}
                >
                  <View style={styles.workoutRow}>
                    <Text style={styles.workoutDate}>{formatDayLabel(workout.scheduledDate)}</Text>
                    <View style={styles.workoutMetaRow}>
                      {workout.distanceKm ? (
                        <Text style={styles.workoutDistance}>{`${workout.distanceKm} km`}</Text>
                      ) : null}
                      <StatusPill status={workout.status} />
                    </View>
                  </View>
                  <Text style={styles.workoutType}>{workout.workoutType}</Text>
                  {workout.targetPace ? (
                    <Text style={styles.workoutMeta}>{`Target pace: ${workout.targetPace}`}</Text>
                  ) : null}
                  {workout.additionalPayload?.notes ? (
                    <Text style={styles.workoutNotes}>{workout.additionalPayload.notes}</Text>
                  ) : null}
                  <View style={styles.workoutActions}>
                    <InlineButton
                      label="Pre-run Check-in"
                      onPress={() => openCheckIn(workout)}
                    />
                    <InlineButton
                      label="Log Workout"
                      onPress={() => openLog(workout)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {plan.generationNotes ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Coach Notes</Text>
            <Text style={styles.noteBody}>{plan.generationNotes}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.replace('GoalSetup')}
        >
          <Text style={styles.secondaryLabel}>Create another plan</Text>
        </Pressable>
      </View>

      <CheckInModal
        visible={checkInVisible}
        onClose={closeCheckIn}
        workout={activeWorkout}
        form={checkInForm}
        onChange={setCheckInForm}
        onSubmit={handleSubmitCheckIn}
        submitting={submitting}
        error={error}
      />

      <LogModal
        visible={logVisible}
        onClose={closeLog}
        workout={activeWorkout}
        form={logForm}
        onChange={setLogForm}
        onSubmit={handleSubmitLog}
        submitting={submitting}
        error={error}
      />
    </ScreenContainer>
  );
};

const SummaryRow = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value ?? '—'}</Text>
  </View>
);

const NextWorkoutCard = ({ workout }) => {
  if (!workout) {
    return null;
  }
  return (
    <View style={styles.nextWorkoutCard}>
      <View style={styles.nextWorkoutHeader}>
        <Text style={styles.nextWorkoutLabel}>Next workout</Text>
        <StatusPill status={workout.status || 'scheduled'} />
      </View>
      <Text style={styles.nextWorkoutTitle}>{workout.workoutType}</Text>
      <Text style={styles.nextWorkoutDate}>{formatFullDate(workout.scheduledDate)}</Text>
      <View style={styles.nextWorkoutMeta}>
        {workout.distanceKm ? (
          <View style={styles.nextWorkoutMetaItem}>
            <Text style={styles.metaLabel}>Distance</Text>
            <Text style={styles.metaValue}>{workout.distanceKm} km</Text>
          </View>
        ) : null}
        {workout.targetPace ? (
          <View style={styles.nextWorkoutMetaItem}>
            <Text style={styles.metaLabel}>Target pace</Text>
            <Text style={styles.metaValue}>{workout.targetPace}</Text>
          </View>
        ) : null}
      </View>
      {workout.additionalPayload?.notes ? (
        <Text style={styles.nextWorkoutNotes}>{workout.additionalPayload.notes}</Text>
      ) : null}
    </View>
  );
};

const InlineButton = ({ label, onPress }) => (
  <Pressable style={styles.inlineButton} onPress={onPress}>
    <Text style={styles.inlineButtonLabel}>{label}</Text>
  </Pressable>
);

const StatusPill = ({ status }) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const palette = {
    completed: { bg: '#dcfce7', text: '#166534' },
    missed: { bg: '#fee2e2', text: '#b91c1c' },
    scheduled: { bg: '#e0f2fe', text: '#0369a1' },
    pending: { bg: '#ede9fe', text: '#5b21b6' },
  };
  const colors = palette[normalized] || palette.scheduled;
  return (
    <View style={[styles.statusPill, { backgroundColor: colors.bg }]}
>
      <Text style={[styles.statusPillLabel, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const RatingSelector = ({ value, onSelect, max = 5 }) => {
  const items = Array.from({ length: max }, (_, idx) => idx + 1);
  return (
    <View style={styles.ratingRow}>
      {items.map((item) => {
        const active = value === item;
        return (
          <Pressable
            key={item}
            style={[styles.ratingItem, active && styles.ratingItemActive]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.ratingLabel, active && styles.ratingLabelActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const ModalShell = ({ visible, title, onClose, children }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.modalClose}>✕</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  </Modal>
);

const CheckInModal = ({ visible, onClose, workout, form, onChange, onSubmit, submitting, error }) => (
  <ModalShell
    visible={visible}
    title={workout ? `Pre-run Check-in (${formatDayLabel(workout.scheduledDate)})` : 'Pre-run Check-in'}
    onClose={onClose}
  >
    <View style={styles.modalBody}>
      <Text style={styles.modalLabel}>Sleep quality</Text>
      <RatingSelector
        value={form.sleepQuality}
        onSelect={(value) => onChange((prev) => ({ ...prev, sleepQuality: value }))}
      />

      <Text style={styles.modalLabel}>Body feel</Text>
      <RatingSelector
        value={form.bodyFeel}
        onSelect={(value) => onChange((prev) => ({ ...prev, bodyFeel: value }))}
      />

      {error ? <Text style={styles.modalError}>{error}</Text> : null}

      <Pressable
        style={[styles.modalPrimary, submitting && styles.modalPrimaryDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.modalPrimaryLabel}>Save Check-in</Text>}
      </Pressable>
    </View>
  </ModalShell>
);

const LogModal = ({ visible, onClose, workout, form, onChange, onSubmit, submitting, error }) => (
  <ModalShell
    visible={visible}
    title={workout ? `Log Workout (${formatDayLabel(workout.scheduledDate)})` : 'Log Workout'}
    onClose={onClose}
  >
    <View style={styles.modalBody}>
      <Text style={styles.modalLabel}>Status</Text>
      <View style={styles.statusOptions}>
        {['completed', 'missed'].map((option) => {
          const active = form.status === option;
          return (
            <Pressable
              key={option}
              style={[styles.statusOption, active && styles.statusOptionActive]}
              onPress={() => onChange((prev) => ({ ...prev, status: option }))}
            >
              <Text style={[styles.statusOptionLabel, active && styles.statusOptionLabelActive]}>
                {option === 'completed' ? 'Completed' : 'Missed'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.modalLabel}>Difficulty</Text>
      <RatingSelector
        value={form.difficulty}
        onSelect={(value) => onChange((prev) => ({ ...prev, difficulty: value }))}
      />

      <Text style={styles.modalLabel}>Notes</Text>
      <TextInput
        style={styles.modalTextarea}
        placeholder="How did it feel?"
        multiline
        value={form.notes}
        onChangeText={(value) => onChange((prev) => ({ ...prev, notes: value }))}
        placeholderTextColor="#94a3b8"
      />

      {error ? <Text style={styles.modalError}>{error}</Text> : null}

      <Pressable
        style={[styles.modalPrimary, submitting && styles.modalPrimaryDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.modalPrimaryLabel}>Save Log</Text>}
      </Pressable>
    </View>
  </ModalShell>
);

const formatRaceDistance = (distance) => distance || 'Upcoming race';

const formatMileage = (range) => {
  if (!range || (range.min == null && range.max == null)) {
    return '—';
  }
  if (range.min == null) return `${range.max} km`; 
  if (range.max == null) return `${range.min} km`;
  if (range.min === range.max) return `${range.min} km`;
  return `${range.min}–${range.max} km`;
};

const formatDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const formatFullDate = (value) => {
  if (!value) return 'Upcoming';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

const formatDayLabel = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
    gap: 20,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 16,
    gap: 12,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  planSubtitle: {
    fontSize: 16,
    color: '#475569',
    marginTop: 4,
  },
  progressSummary: {
    gap: 12,
  },
  progressNumeric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0f6cbd',
    borderRadius: 6,
  },
  progressBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressBreakdownLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressBreakdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 12,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  weekCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  weekBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  weekTextGroup: {
    flex: 1,
  },
  weekTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  weekSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  workoutList: {
    gap: 12,
  },
  workoutItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutDate: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  workoutDistance: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  workoutMeta: {
    fontSize: 13,
    color: '#475569',
  },
  workoutNotes: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  inlineButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
  },
  inlineButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  noteBody: {
    fontSize: 14,
    color: '#0f172a',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#475569',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyCopy: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
  nextWorkoutCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  nextWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextWorkoutLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5f5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextWorkoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  nextWorkoutDate: {
    fontSize: 16,
    color: '#cbd5f5',
  },
  nextWorkoutMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  nextWorkoutMetaItem: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  nextWorkoutNotes: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ratingItem: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingItemActive: {
    backgroundColor: '#0f6cbd',
    borderColor: '#0f6cbd',
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingLabelActive: {
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 16,
    color: '#475569',
  },
  modalBody: {
    gap: 16,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalTextarea: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  modalPrimary: {
    backgroundColor: '#0f6cbd',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalPrimaryDisabled: {
    opacity: 0.6,
  },
  modalPrimaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalError: {
    color: '#dc2626',
    fontSize: 14,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  statusOptionActive: {
    backgroundColor: '#0f6cbd',
    borderColor: '#0f6cbd',
  },
  statusOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusOptionLabelActive: {
    color: '#ffffff',
  },
});

export default PlanOverviewScreen;
