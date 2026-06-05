import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLatest } from '../api/smartGardenApi';
import { FriendlySensorCard } from '../components/FriendlySensorCard';
import { GardenHealthCard } from '../components/GardenHealthCard';
import { StatusPill } from '../components/StatusPill';
import { useI18n } from '../i18n/I18nProvider';
import { getProfile } from '../storage/profileStorage';
import type { LatestTelemetry, LocalProfile } from '../types/smartGarden';
import { formatLastUpdate, formatRainStatus, formatValveStatus } from '../utils/formatters';

export function HomeScreen() {
  const { language, t } = useI18n();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadHome({ refreshing = false }: { refreshing?: boolean } = {}) {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      const [nextProfile, latestTelemetry] = await Promise.all([getProfile(), getLatest()]);
      setProfile(nextProfile);
      setTelemetry(latestTelemetry);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.backend'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [])
  );

  const name = profile?.name || 'Gardener';
  const lastSeen = telemetry?.received_at ?? telemetry?.last_update ?? null;
  const valveTone = telemetry?.valve_status === 'open' ? 'warning' : telemetry?.valve_status === 'closed' ? 'good' : 'neutral';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#2f6f3e']}
            onRefresh={() => void loadHome({ refreshing: true })}
            refreshing={isRefreshing}
            tintColor="#2f6f3e"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>{t('home.brand')}</Text>
            <Text style={styles.title}>{t('home.welcome', { name })}</Text>
            {profile?.garden_name ? <Text style={styles.subtitle}>{profile.garden_name}</Text> : null}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color="#3d7c4a" />
            <Text style={styles.helperText}>{t('home.loading')}</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.centerCard}>
            <StatusPill label={t('home.backendUnreachable')} tone="warning" />
            <Text style={styles.cardTitle}>{t('home.checkFailed')}</Text>
            {telemetry ? (
              <Text style={styles.helperText}>{t('home.lastSaved')}</Text>
            ) : null}
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadHome()}>
              <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && telemetry ? (
          <>
            <GardenHealthCard telemetry={telemetry} />

            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>{t('common.lastUpdate')}</Text>
                <Text style={styles.overviewValue}>{lastSeen ? formatLastUpdate(lastSeen, language) : t('format.unknown')}</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>{t('home.waterValve')}</Text>
                <Text style={styles.overviewValue}>{formatValveStatus(telemetry.valve_status, language)}</Text>
              </View>
            </View>

            <View style={styles.sensorGrid}>
              <FriendlySensorCard
                accentColor="#3f8f51"
                helper={
                  telemetry.soil_moisture < 25
                    ? t('home.soilVeryDry', { raw: telemetry.soil_raw ?? '' })
                    : telemetry.soil_moisture < 40
                      ? t('home.soilDry', { raw: telemetry.soil_raw ?? '' })
                      : t('home.soilHealthy', { raw: telemetry.soil_raw ?? '' })
                }
                label={t('home.soilMoisture')}
                value={`${telemetry.soil_moisture}%`}
              />
              <FriendlySensorCard
                accentColor="#d98a2b"
                helper={t('home.temperatureHelper')}
                label={t('home.temperature')}
                value={`${telemetry.temperature}°C`}
              />
              <FriendlySensorCard
                accentColor="#4d8fbd"
                helper={t('home.humidityHelper')}
                label={t('home.humidity')}
                value={`${telemetry.humidity}%`}
              />
              <FriendlySensorCard
                accentColor={telemetry.rain_detected ? '#4d8fbd' : '#9aad88'}
                helper={
                  telemetry.rain_detected
                    ? t('home.rainDetectedHelper', { wetness: telemetry.rain_wetness ?? '' })
                    : t('home.rainClearHelper', { raw: telemetry.rain_raw ?? '' })
                }
                label={t('home.rain')}
                value={formatRainStatus(telemetry.rain_detected, language)}
              />
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusTextBlock}>
                <Text style={styles.cardTitle}>{t('home.waterValve')}</Text>
                <Text style={styles.helperText}>
                  {telemetry.valve_updated_at
                    ? t('water.updated', { value: formatLastUpdate(telemetry.valve_updated_at, language) })
                    : t('home.currentWateringState')}
                </Text>
                {telemetry.valve_source ? <Text style={styles.metaText}>{t('common.source', { value: telemetry.valve_source })}</Text> : null}
                {lastSeen ? <Text style={styles.metaText}>{t('common.lastUpdate')}: {formatLastUpdate(lastSeen, language)}</Text> : null}
              </View>
              <View style={styles.statusMeta}>
                <StatusPill label={formatValveStatus(telemetry.valve_status, language)} tone={valveTone} />
                {telemetry.valve_command_id ? <Text style={styles.commandText}>{t('home.commandId', { id: telemetry.valve_command_id })}</Text> : null}
              </View>
            </View>
          </>
        ) : null}
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
  header: {
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  headerTextBlock: {
    maxWidth: '100%',
  },
  eyebrow: {
    color: '#5f7f58',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#203522',
    flexShrink: 1,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#667761',
    flexShrink: 1,
    fontSize: 17,
    marginTop: 4,
  },
  centerCard: {
    backgroundColor: '#fbfff6',
    borderRadius: 28,
    gap: 14,
    padding: 22,
  },
  helperText: {
    color: '#667761',
    fontSize: 15,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  overviewCard: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  overviewLabel: {
    color: '#667761',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  overviewValue: {
    color: '#203522',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  statusTextBlock: {
    flex: 1,
    paddingRight: 16,
  },
  statusMeta: {
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
  },
  cardTitle: {
    color: '#203522',
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  metaText: {
    color: '#71816c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  commandText: {
    color: '#667761',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#8a4b20',
    fontSize: 15,
    lineHeight: 21,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 18,
    padding: 14,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
