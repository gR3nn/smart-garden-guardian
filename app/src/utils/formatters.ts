import type { AppLanguage } from '../types/smartGarden';
import { translate } from '../i18n/translations';

export function formatLastUpdate(value: string, language: AppLanguage = 'en'): string {
  if (!value) {
    return translate(language, 'format.unknown');
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(language === 'ro' ? 'ro-RO' : 'en-US');
}

export function formatValveStatus(value: string | null | undefined, language: AppLanguage = 'en'): string {
  if (value === 'open') {
    return translate(language, 'format.valve.open');
  }

  if (value === 'closed') {
    return translate(language, 'format.valve.closed');
  }

  return translate(language, 'format.valve.unknown');
}

export function formatRainStatus(rainDetected: boolean, language: AppLanguage = 'en'): string {
  return rainDetected ? translate(language, 'format.rain.detected') : translate(language, 'format.rain.clear');
}
