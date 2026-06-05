import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createSchedule as createScheduleRequest,
  deleteSchedule as deleteScheduleRequest,
  getSchedules as getSchedulesRequest,
} from '../api/smartGardenApi';
import { EmptyState } from '../components/EmptyState';
import { ScheduleCard } from '../components/ScheduleCard';
import { StatusPill } from '../components/StatusPill';
import { useI18n } from '../i18n/I18nProvider';
import { getCachedSchedules, saveSchedules } from '../storage/scheduleStorage';
import type { ScheduleDurationSeconds, WateringSchedule } from '../types/smartGarden';

const DURATIONS: ScheduleDurationSeconds[] = [5, 10, 15];
const DEFAULT_TIMEZONE = 'Europe/Bucharest';
const DEFAULT_DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID ?? 'garden_node_01';

export function ScheduleScreen() {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<WateringSchedule[]>([]);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState<ScheduleDurationSeconds>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  async function loadSchedules({ keepExisting = false }: { keepExisting?: boolean } = {}) {
    try {
      setIsLoading(true);
      const response = await getSchedulesRequest();
      const nextSchedules = normalizeSchedules(response.schedules);
      await saveSchedules(nextSchedules);
      setSchedules(nextSchedules);
      setErrorMessage(null);
    } catch {
      const cachedSchedules = await getCachedSchedules();
      if (cachedSchedules.length > 0) {
        setSchedules((current) => (keepExisting && current.length > 0 ? current : normalizeSchedules(cachedSchedules)));
      }
      setErrorMessage(t('schedule.error.load'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateSchedule() {
    const sanitizedLabel = sanitizeLabel(label, t('schedule.namePlaceholder'));
    const sanitizedTime = sanitizeTime(time);

    if (!isValidTime(sanitizedTime)) {
      setErrorMessage(t('schedule.error.time'));
      return;
    }

    if (!isValidDuration(duration)) {
      setErrorMessage(t('schedule.error.duration'));
      return;
    }

    if (hasRecurringDuplicate(schedules, sanitizedTime, DEFAULT_DEVICE_ID)) {
      setErrorMessage(t('schedule.error.duplicate'));
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const response = await createScheduleRequest({
        label: sanitizedLabel,
        time: sanitizedTime,
        duration_seconds: duration,
        timezone: DEFAULT_TIMEZONE,
        device_id: DEFAULT_DEVICE_ID,
        one_time: false,
      });
      setFeedbackMessage(t('schedule.feedback.created'));
      setErrorMessage(null);
      setLabel('');
      setTime('08:00');
      setDuration(10);
      await loadSchedules({ keepExisting: true });
    } catch {
      setErrorMessage(t('schedule.error.save'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(scheduleId: string) {
    Alert.alert(t('schedule.deleteTitle'), t('schedule.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void handleDeleteSchedule(scheduleId),
      },
    ]);
  }

  async function handleDeleteSchedule(scheduleId: string) {
    try {
      setDeletingId(scheduleId);
      setFeedbackMessage(null);
      await deleteScheduleRequest(scheduleId);
      setFeedbackMessage(t('schedule.feedback.deleted'));
      setErrorMessage(null);
      await loadSchedules({ keepExisting: true });
    } catch {
      setErrorMessage(t('schedule.error.delete'));
    } finally {
      setDeletingId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadSchedules();
    }, [t])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{t('schedule.eyebrow')}</Text>
        <Text style={styles.title}>{t('schedule.title')}</Text>
        <Text style={styles.body}>{t('schedule.body')}</Text>

        <View style={styles.noticeCard}>
          <StatusPill label={t('schedule.notice')} tone="neutral" />
          <Text style={styles.noticeText}>{t('schedule.noticeBody')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>{t('schedule.create')}</Text>

          <Text style={styles.label}>{t('schedule.name')}</Text>
          <TextInput
            autoCapitalize="sentences"
            onChangeText={setLabel}
            placeholder={t('schedule.namePlaceholder')}
            placeholderTextColor="#9aad88"
            style={styles.input}
            value={label}
          />

          <Text style={styles.label}>{t('schedule.time')}</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor="#9aad88"
            style={styles.input}
            value={time}
          />

          <Text style={styles.label}>{t('schedule.duration')}</Text>
          <View style={styles.segmentRow}>
            {DURATIONS.map((item) => (
              <SegmentButton active={duration === item} key={item} label={t(`schedule.duration.${item}`)} onPress={() => setDuration(item)} />
            ))}
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaText}>{t('schedule.form.timezone', { value: DEFAULT_TIMEZONE })}</Text>
            <Text style={styles.metaText}>{t('schedule.form.device', { value: DEFAULT_DEVICE_ID })}</Text>
          </View>

          <Pressable
            disabled={isSubmitting}
            style={[styles.primaryButton, isSubmitting ? styles.disabled : null]}
            onPress={() => void handleCreateSchedule()}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? t('schedule.saving') : t('schedule.save')}</Text>
          </Pressable>
        </View>

        {feedbackMessage ? (
          <View style={styles.feedbackCard}>
            <StatusPill label={t('common.saved')} tone="good" />
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{t('schedule.saved')}</Text>
          <Text style={styles.countText}>{t('schedule.count', { count: schedules.length })}</Text>
        </View>

        <View style={styles.scheduleList}>
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#2f6f3e" />
              <Text style={styles.loadingText}>{t('schedule.loading')}</Text>
            </View>
          ) : schedules.length === 0 ? (
            <EmptyState message={t('schedule.emptyBody')} title={t('schedule.emptyTitle')} />
          ) : (
            schedules.map((schedule) => (
              <View key={schedule.schedule_id} style={deletingId === schedule.schedule_id ? styles.disabled : null}>
                <ScheduleCard onDelete={confirmDelete} schedule={schedule} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDuration(value: number): value is ScheduleDurationSeconds {
  return value === 5 || value === 10 || value === 15;
}

function sanitizeLabel(value: string, fallback: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 60);
  return cleaned || fallback;
}

function sanitizeTime(value: string): string {
  return value.replace(/\s+/g, '');
}

function hasRecurringDuplicate(schedules: WateringSchedule[], time: string, deviceId: string): boolean {
  return schedules.some((schedule) => {
    const isRecurring = !(schedule.one_time || schedule.type === 'one_time');
    return isRecurring && schedule.device_id === deviceId && schedule.time === time;
  });
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active ? styles.segmentButtonActive : null]} onPress={onPress}>
      <Text style={[styles.segmentButtonText, active ? styles.segmentButtonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function normalizeSchedules(schedules: WateringSchedule[]): WateringSchedule[] {
  return schedules
    .filter((schedule) => schedule.duration_seconds === 5 || schedule.duration_seconds === 10 || schedule.duration_seconds === 15)
    .sort((left, right) => {
      const leftKey = `${left.date ?? '9999-12-31'} ${left.time}`;
      const rightKey = `${right.date ?? '9999-12-31'} ${right.time}`;
      return leftKey.localeCompare(rightKey);
    });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7e8',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    color: '#5f7f58',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#203522',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginTop: 8,
  },
  body: {
    color: '#667761',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  noticeCard: {
    backgroundColor: '#fff8ed',
    borderColor: '#f5cda7',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 18,
  },
  noticeText: {
    color: '#7a5a31',
    fontSize: 15,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  cardTitle: {
    color: '#203522',
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    color: '#405543',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f5fbef',
    borderColor: '#dbe9d1',
    borderRadius: 18,
    borderWidth: 1,
    color: '#203522',
    fontSize: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: '#edf6dc',
    borderRadius: 16,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: '#2f6f3e',
  },
  segmentButtonText: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentButtonTextActive: {
    color: '#f8fff5',
  },
  metaCard: {
    backgroundColor: '#f5fbef',
    borderRadius: 18,
    gap: 6,
    marginTop: 16,
    padding: 14,
  },
  metaText: {
    color: '#667761',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#f7fff2',
    fontSize: 15,
    fontWeight: '900',
  },
  feedbackCard: {
    backgroundColor: '#f3ffef',
    borderColor: '#cde7bf',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 16,
  },
  feedbackText: {
    color: '#2f6f3e',
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#fff1ec',
    borderColor: '#f6c5b2',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  errorText: {
    color: '#8c4d2a',
    fontSize: 14,
    lineHeight: 20,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  sectionTitle: {
    color: '#203522',
    fontSize: 20,
    fontWeight: '900',
  },
  countText: {
    color: '#667761',
    fontSize: 13,
    fontWeight: '800',
  },
  scheduleList: {
    gap: 14,
    marginTop: 14,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  loadingText: {
    color: '#667761',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.55,
  },
});
