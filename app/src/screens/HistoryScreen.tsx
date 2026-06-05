import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHistory } from '../api/smartGardenApi';
import { EmptyState } from '../components/EmptyState';
import { ReadingSummaryCard } from '../components/ReadingSummaryCard';
import { StatusPill } from '../components/StatusPill';
import { useI18n } from '../i18n/I18nProvider';
import type { HistoryReading } from '../types/smartGarden';
import { formatLastUpdate, formatValveStatus } from '../utils/formatters';

export function HistoryScreen() {
  const { language, t } = useI18n();
  const [readings, setReadings] = useState<HistoryReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadHistory({ refreshing = false }: { refreshing?: boolean } = {}) {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const nextReadings = await getHistory();
      setReadings(sortReadings(nextReadings));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('history.unavailable'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const summary = getHistorySummary(readings);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#2f6f3e']}
            onRefresh={() => void loadHistory({ refreshing: true })}
            refreshing={isRefreshing}
            tintColor="#2f6f3e"
          />
        }
      >
        <Text style={styles.eyebrow}>{t('history.eyebrow')}</Text>
        <Text style={styles.title}>{t('history.title')}</Text>
        <Text style={styles.body}>{t('history.body')}</Text>

        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color="#3d7c4a" />
            <Text style={styles.helperText}>{t('history.loading')}</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <StatusPill label={t('history.unavailable')} tone="warning" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadHistory()}>
              <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !errorMessage && readings.length === 0 ? (
          <EmptyState
            message={t('history.emptyBody')}
            title={t('history.emptyTitle')}
          />
        ) : null}

        {!isLoading && readings.length > 0 ? (
          <>
            <ReadingSummaryCard
              averageHumidity={summary.averageHumidity}
              averageSoilMoisture={summary.averageSoilMoisture}
              highestTemperature={summary.highestTemperature}
              rainDetections={summary.rainDetections}
            />

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>{t('history.sectionTitle')}</Text>
              <Text style={styles.countText}>{t('history.readingsCount', { count: readings.length })}</Text>
            </View>

            <View style={styles.readingList}>
              {readings.map((reading, index) => (
                <ReadingCard key={`${reading.timestamp}-${index}`} language={language} reading={reading} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadingCard({ reading, language }: { reading: HistoryReading; language: 'en' | 'ro' }) {
  const { t } = useI18n();

  return (
    <View style={styles.readingCard}>
      <View style={styles.readingHeader}>
        <View>
          <Text style={styles.readingTime}>{formatLastUpdate(reading.timestamp, language)}</Text>
          <Text style={styles.readingSubtext}>
            {t('history.valveLine', { status: formatValveStatus(reading.valve_status, language).toLowerCase() })}
          </Text>
        </View>
        <StatusPill
          label={reading.rain_detected ? t('history.rain') : t('history.noRain')}
          tone={reading.rain_detected ? 'good' : 'neutral'}
        />
      </View>

      <View style={styles.metricRow}>
        <Metric label={t('history.metric.soil')} value={`${reading.soil_moisture}%`} />
        <Metric label={t('history.metric.temp')} value={`${reading.temperature}°C`} />
        <Metric label={t('history.metric.humidity')} value={`${reading.humidity}%`} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function sortReadings(nextReadings: HistoryReading[]): HistoryReading[] {
  return [...nextReadings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function getHistorySummary(readings: HistoryReading[]) {
  if (readings.length === 0) {
    return {
      averageSoilMoisture: 0,
      highestTemperature: 0,
      averageHumidity: 0,
      rainDetections: 0,
    };
  }

  const totals = readings.reduce(
    (accumulator, reading) => ({
      soil: accumulator.soil + reading.soil_moisture,
      humidity: accumulator.humidity + reading.humidity,
      highestTemperature: Math.max(accumulator.highestTemperature, reading.temperature),
      rainDetections: accumulator.rainDetections + (reading.rain_detected ? 1 : 0),
    }),
    {
      soil: 0,
      humidity: 0,
      highestTemperature: Number.NEGATIVE_INFINITY,
      rainDetections: 0,
    },
  );

  return {
    averageSoilMoisture: Math.round(totals.soil / readings.length),
    highestTemperature: roundOneDecimal(totals.highestTemperature),
    averageHumidity: Math.round(totals.humidity / readings.length),
    rainDetections: totals.rainDetections,
  };
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
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
    marginTop: 8,
  },
  body: {
    color: '#667761',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
    marginTop: 8,
  },
  centerCard: {
    backgroundColor: '#fbfff6',
    borderRadius: 26,
    gap: 12,
    padding: 22,
  },
  helperText: {
    color: '#667761',
    fontSize: 15,
  },
  errorCard: {
    backgroundColor: '#ffeac7',
    borderRadius: 24,
    gap: 12,
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
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionTitle: {
    color: '#203522',
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
  },
  countText: {
    color: '#71816c',
    fontSize: 14,
    fontWeight: '800',
  },
  readingList: {
    gap: 12,
    marginTop: 12,
  },
  readingCard: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  readingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readingTime: {
    color: '#203522',
    fontSize: 16,
    fontWeight: '900',
    maxWidth: 230,
  },
  readingSubtext: {
    color: '#71816c',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    backgroundColor: '#eef7e8',
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: '#667761',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#203522',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
});
