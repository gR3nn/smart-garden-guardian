import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import type { LatestTelemetry } from '../types/smartGarden';
import { formatLastUpdate } from '../utils/formatters';
import { getGardenHealthSummary, type GardenHealthTone } from '../utils/gardenHealth';
import { StatusPill } from './StatusPill';

interface GardenHealthCardProps {
  telemetry: LatestTelemetry;
}

const toneStyles: Record<GardenHealthTone, { backgroundColor: string; accentColor: string; icon: string }> = {
  excellent: {
    backgroundColor: '#dff4c8',
    accentColor: '#2f6f3e',
    icon: 'Blooming',
  },
  fine: {
    backgroundColor: '#edf6dc',
    accentColor: '#4f7f38',
    icon: 'Growing',
  },
  dry: {
    backgroundColor: '#fff0c7',
    accentColor: '#95651b',
    icon: 'Thirsty',
  },
  urgent: {
    backgroundColor: '#ffe0c2',
    accentColor: '#944323',
    icon: 'Needs care',
  },
};

export function GardenHealthCard({ telemetry }: GardenHealthCardProps) {
  const { language, t } = useI18n();
  const summary = getGardenHealthSummary(telemetry, language);
  const tone = toneStyles[summary.tone];
  const lastSeen = telemetry.received_at ?? telemetry.last_update;
  const moodLabel =
    summary.tone === 'excellent'
      ? t('health.mood.blooming')
      : summary.tone === 'fine'
        ? t('health.mood.growing')
        : summary.tone === 'dry'
          ? t('health.mood.thirsty')
          : t('health.mood.needsCare');

  return (
    <View style={[styles.card, { backgroundColor: tone.backgroundColor }]}>
      <View style={styles.topRow}>
        <View style={styles.pillWrap}>
          <StatusPill label={t('health.liveCheck')} tone={summary.tone === 'urgent' ? 'warning' : 'good'} />
        </View>
        <Text numberOfLines={2} style={[styles.mood, { color: tone.accentColor }]}>
          {moodLabel}
        </Text>
      </View>
      <Text style={styles.title}>{summary.message}</Text>
      <Text style={styles.helper}>{summary.helper}</Text>
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>{t('health.lastUpdate')}</Text>
        <Text style={styles.footerValue}>{formatLastUpdate(lastSeen, language)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 34,
    gap: 14,
    padding: 24,
    shadowColor: '#5f7f58',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 4,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  pillWrap: {
    flexShrink: 0,
    maxWidth: '48%',
  },
  mood: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  title: {
    color: '#203522',
    flexShrink: 1,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 35,
  },
  helper: {
    color: '#52634d',
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 23,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 20,
    padding: 14,
  },
  footerLabel: {
    color: '#667761',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerValue: {
    color: '#203522',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
});
