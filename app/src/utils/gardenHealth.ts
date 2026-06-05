import { translate } from '../i18n/translations';
import type { AppLanguage } from '../types/smartGarden';
import type { LatestTelemetry } from '../types/smartGarden';

export type GardenHealthTone = 'excellent' | 'fine' | 'dry' | 'urgent';

export interface GardenHealthSummary {
  message: string;
  tone: GardenHealthTone;
  helper: string;
}

export function getGardenHealthSummary(
  telemetry: LatestTelemetry,
  language: AppLanguage = 'en'
): GardenHealthSummary {
  const moisture = telemetry.soil_moisture;

  if (telemetry.rain_detected) {
    return {
      message: translate(language, 'health.rainTitle'),
      tone: moisture < 25 ? 'dry' : 'fine',
      helper: translate(language, 'health.rainHelper'),
    };
  }

  if (moisture >= 40) {
    return {
      message: translate(language, 'health.doingWell'),
      tone: moisture >= 55 ? 'excellent' : 'fine',
      helper: translate(language, 'health.healthy'),
    };
  }

  if (moisture >= 25) {
    return {
      message: translate(language, 'health.bitDry'),
      tone: 'dry',
      helper: translate(language, 'health.waterSoon'),
    };
  }

  return {
    message: translate(language, 'health.bitDry'),
    tone: 'urgent',
    helper: translate(language, 'health.veryDry'),
  };
}

export function getGardenHealthMessage(telemetry: LatestTelemetry, language: AppLanguage = 'en'): string {
  return getGardenHealthSummary(telemetry, language).message;
}
