import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getAppLanguage, saveAppLanguage } from '../storage/appPreferencesStorage';
import type { AppLanguage } from '../types/smartGarden';
import { translate } from './translations';

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    void (async () => {
      const storedLanguage = await getAppLanguage();
      setLanguageState(storedLanguage);
    })();
  }, []);

  async function setLanguage(language: AppLanguage) {
    await saveAppLanguage(language);
    setLanguageState(language);
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider.');
  }

  return value;
}
