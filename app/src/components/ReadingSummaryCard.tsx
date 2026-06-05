import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';

interface ReadingSummaryCardProps {
  averageSoilMoisture: number;
  highestTemperature: number;
  averageHumidity: number;
  rainDetections: number;
}

export function ReadingSummaryCard({
  averageSoilMoisture,
  highestTemperature,
  averageHumidity,
  rainDetections,
}: ReadingSummaryCardProps) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('history.summary.title')}</Text>
      <Text style={styles.subtitle}>{t('history.summary.subtitle')}</Text>

      <View style={styles.grid}>
        <SummaryTile label={t('history.summary.avgSoil')} value={`${averageSoilMoisture}%`} />
        <SummaryTile label={t('history.summary.highTemp')} value={`${highestTemperature}°C`} />
        <SummaryTile label={t('history.summary.avgHumidity')} value={`${averageHumidity}%`} />
        <SummaryTile label={t('history.summary.rainChecks')} value={`${rainDetections}`} />
      </View>
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#dff4c8',
    borderRadius: 30,
    gap: 14,
    padding: 20,
  },
  title: {
    color: '#203522',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#52634d',
    fontSize: 15,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: 20,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  tileLabel: {
    color: '#667761',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tileValue: {
    color: '#203522',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
  },
});
