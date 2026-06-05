import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import type { WateringSchedule } from '../types/smartGarden';
import { StatusPill } from './StatusPill';

interface ScheduleCardProps {
  schedule: WateringSchedule;
  onDelete: (scheduleId: string) => void;
}

export function ScheduleCard({ schedule, onDelete }: ScheduleCardProps) {
  const { t } = useI18n();
  const isOneTime = schedule.one_time || schedule.type === 'one_time';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{schedule.label}</Text>
          {isOneTime && schedule.date ? <Text style={styles.date}>{t('schedule.card.date', { value: schedule.date })}</Text> : null}
          <Text style={styles.time}>{schedule.time}</Text>
          <Text style={styles.detail}>{t('schedule.card.detail', { seconds: schedule.duration_seconds })}</Text>
        </View>
        <StatusPill label={schedule.enabled ? t('common.enabled') : t('common.paused')} tone={schedule.enabled ? 'good' : 'neutral'} />
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>{t('schedule.card.type', { value: isOneTime ? t('schedule.type.oneTime') : t('schedule.type.recurring') })}</Text>
        <Text style={styles.metaLine}>{t('schedule.card.timezone', { value: schedule.timezone })}</Text>
        <Text style={styles.metaLine}>{t('schedule.card.device', { value: schedule.device_id })}</Text>
      </View>

      <Text style={styles.cloudLabel}>{t('schedule.card.cloudManaged')}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.deleteButton} onPress={() => onDelete(schedule.schedule_id)}>
          <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    color: '#203522',
    fontSize: 18,
    fontWeight: '900',
  },
  time: {
    color: '#2f6f3e',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  date: {
    color: '#667761',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  detail: {
    color: '#667761',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  metaBlock: {
    gap: 4,
    marginTop: 12,
  },
  metaLine: {
    color: '#667761',
    fontSize: 13,
    lineHeight: 18,
  },
  cloudLabel: {
    color: '#71816c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 14,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fff0e8',
    borderRadius: 16,
    flex: 1,
    padding: 12,
  },
  deleteButtonText: {
    color: '#8a4b20',
    fontSize: 14,
    fontWeight: '900',
  },
});
