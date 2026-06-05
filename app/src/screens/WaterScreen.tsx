import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLatest, sendCommand } from '../api/smartGardenApi';
import { StatusPill } from '../components/StatusPill';
import { WaterActionButton } from '../components/WaterActionButton';
import { useI18n } from '../i18n/I18nProvider';
import type { LatestTelemetry, WateringDurationSeconds } from '../types/smartGarden';
import { formatLastUpdate, formatValveStatus } from '../utils/formatters';

const WATERING_DURATIONS: WateringDurationSeconds[] = [15, 30, 60];
const INITIAL_REFRESH_DELAY_MS = 1500;
const FINAL_REFRESH_BUFFER_MS = 1000;

export function WaterScreen() {
  const { language, t } = useI18n();
  const [telemetry, setTelemetry] = useState<LatestTelemetry | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [activeCommand, setActiveCommand] = useState<WateringDurationSeconds | 'stop' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refreshTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  async function loadValveStatus(options?: { silent?: boolean }) {
    try {
      if (!options?.silent) {
        setIsLoadingStatus(true);
      }
      const latestTelemetry = await getLatest();
      setTelemetry(latestTelemetry);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not check the water valve.');
    } finally {
      if (!options?.silent) {
        setIsLoadingStatus(false);
      }
    }
  }

  function clearRefreshTimeouts() {
    for (const timeoutId of refreshTimeoutsRef.current) {
      clearTimeout(timeoutId);
    }

    refreshTimeoutsRef.current = [];
  }

  function scheduleLatestRefresh(duration?: WateringDurationSeconds) {
    clearRefreshTimeouts();

    const firstRefresh = setTimeout(() => {
      void loadValveStatus({ silent: true });
    }, INITIAL_REFRESH_DELAY_MS);

    refreshTimeoutsRef.current.push(firstRefresh);

    if (!duration) {
      return;
    }

    const finalRefresh = setTimeout(() => {
      void loadValveStatus({ silent: true });
    }, duration * 1000 + FINAL_REFRESH_BUFFER_MS);

    refreshTimeoutsRef.current.push(finalRefresh);
  }

  async function waterGarden(duration: WateringDurationSeconds) {
    try {
      setActiveCommand(duration);
      setFeedbackMessage(null);
      setErrorMessage(null);
      const response = await sendCommand({
        command: 'open_valve',
        duration_seconds: duration,
        source: 'mobile',
      });
      setFeedbackMessage(response.message || t(`water.feedback.open`, { duration: getWateringLabel(duration, t) }));
      await loadValveStatus();
      scheduleLatestRefresh(duration);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the watering command.');
    } finally {
      setActiveCommand(null);
    }
  }

  async function stopWatering() {
    try {
      setActiveCommand('stop');
      setFeedbackMessage(null);
      setErrorMessage(null);
      const response = await sendCommand({
        command: 'close_valve',
        duration_seconds: 0,
        source: 'mobile',
      });
      setFeedbackMessage(response.message || t('water.feedback.stop'));
      await loadValveStatus();
      scheduleLatestRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send emergency stop.');
    } finally {
      setActiveCommand(null);
    }
  }

  function confirmWatering(duration: WateringDurationSeconds) {
    Alert.alert(
      t('water.confirmTitle', { duration: getWateringLabel(duration, t) }),
      t('water.confirmBody'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('water.confirmAction'),
          onPress: () => void waterGarden(duration),
        },
      ]
    );
  }

  useEffect(() => {
    void loadValveStatus();

    return () => {
      clearRefreshTimeouts();
    };
  }, []);

  const commandInProgress = activeCommand !== null;
  const valveIsOpen = telemetry?.valve_status === 'open';
  const valveTone = isLoadingStatus ? 'neutral' : valveIsOpen ? 'warning' : telemetry?.valve_status === 'closed' ? 'good' : 'neutral';
  const statusDescription = isLoadingStatus
    ? t('common.checking')
    : telemetry
      ? valveIsOpen
        ? t('water.activeStatus')
        : `${t('common.lastUpdate')}: ${formatLastUpdate(telemetry.received_at ?? telemetry.last_update, language)}`
      : t('water.statusUnavailable');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t('water.eyebrow')}</Text>
        <Text style={styles.title}>{t('water.title')}</Text>
        <Text style={styles.body}>{t('water.body')}</Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>{t('water.valve')}</Text>
          <Text style={styles.noticeBody}>{t('water.confirmBody')}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <Text style={styles.cardTitle}>{t('water.valve')}</Text>
            <Text style={styles.statusHelper}>{statusDescription}</Text>
            {telemetry?.valve_updated_at ? (
              <Text style={styles.statusMeta}>{t('water.updated', { value: formatLastUpdate(telemetry.valve_updated_at, language) })}</Text>
            ) : null}
            {telemetry?.valve_source ? <Text style={styles.statusMeta}>{t('common.source', { value: telemetry.valve_source })}</Text> : null}
          </View>
          <View style={styles.statusPillWrap}>
            <StatusPill
              label={isLoadingStatus ? t('common.checking') : telemetry ? formatValveStatus(telemetry.valve_status, language) : t('format.unknown')}
              tone={valveTone}
            />
            {valveIsOpen ? <Text style={styles.activeWateringText}>{t('water.active')}</Text> : null}
          </View>
        </View>

        {feedbackMessage ? (
          <View style={styles.feedbackCard}>
            <StatusPill label={t('water.commandSent')} tone="good" />
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <StatusPill label={t('common.needsAttention')} tone="warning" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadValveStatus()}>
              <Text style={styles.retryButtonText}>{t('water.refreshValveStatus')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actions}>
          {WATERING_DURATIONS.map((duration) => (
            <WaterActionButton
              disabled={commandInProgress}
              key={duration}
              loading={activeCommand === duration}
              onPress={() => confirmWatering(duration)}
              subtitle={t('water.openFor', { duration: getWateringLabel(duration, t) })}
              title={t('water.waterFor', { duration: getWateringLabel(duration, t) })}
              tone={valveIsOpen ? 'active' : 'water'}
            />
          ))}
        </View>

        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>{t('water.emergencyTitle')}</Text>
          <Text style={styles.emergencyBody}>{t('water.emergencyBody')}</Text>
          <WaterActionButton
            disabled={commandInProgress && activeCommand !== 'stop'}
            loading={activeCommand === 'stop'}
            onPress={() => void stopWatering()}
            subtitle={t('water.closeNow')}
            title={t('water.stopWatering')}
            tone="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  statusCard: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  noticeCard: {
    backgroundColor: '#f6fbef',
    borderColor: '#dce9d2',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  noticeTitle: {
    color: '#203522',
    fontSize: 15,
    fontWeight: '900',
  },
  noticeBody: {
    color: '#667761',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  statusContent: {
    paddingRight: 16,
  },
  cardTitle: {
    color: '#203522',
    fontSize: 19,
    fontWeight: '900',
  },
  statusHelper: {
    color: '#71816c',
    fontSize: 13,
    marginTop: 5,
    maxWidth: 260,
  },
  statusMeta: {
    color: '#71816c',
    fontSize: 12,
    marginTop: 6,
  },
  statusPillWrap: {
    alignItems: 'flex-start',
    marginTop: 14,
  },
  activeWateringText: {
    color: '#95651b',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  feedbackCard: {
    backgroundColor: '#dff4c8',
    borderRadius: 24,
    gap: 10,
    marginTop: 14,
    padding: 18,
  },
  feedbackText: {
    color: '#203522',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: '#ffeac7',
    borderRadius: 24,
    gap: 12,
    marginTop: 14,
    padding: 18,
  },
  errorText: {
    color: '#8a4b20',
    fontSize: 15,
    lineHeight: 21,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 16,
    padding: 13,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  emergencySection: {
    backgroundColor: '#fff8ed',
    borderColor: '#f5cda7',
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    marginTop: 22,
    padding: 18,
  },
  emergencyTitle: {
    color: '#7f1d1d',
    fontSize: 20,
    fontWeight: '900',
  },
  emergencyBody: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
  },
});

function getWateringLabel(
  duration: WateringDurationSeconds,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (duration === 15) {
    return t('water.duration.15');
  }

  if (duration === 30) {
    return t('water.duration.30');
  }

  return t('water.duration.60');
}
