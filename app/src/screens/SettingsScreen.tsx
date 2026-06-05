import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getConfiguredApiBaseUrl, getLatest } from '../api/smartGardenApi';
import { StatusPill } from '../components/StatusPill';
import { useI18n } from '../i18n/I18nProvider';
import { DEFAULT_PROFILE, getProfile, resetProfile, saveProfile } from '../storage/profileStorage';
import { clearSchedules } from '../storage/scheduleStorage';
import type { AppLanguage, LocalProfile } from '../types/smartGarden';
import { formatLastUpdate } from '../utils/formatters';

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID ?? 'garden_node_01';

export function SettingsScreen() {
  const { language, setLanguage, t } = useI18n();
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProfile() {
    try {
      const storedProfile = await getProfile();
      setProfile({
        name: storedProfile.name ?? DEFAULT_PROFILE.name,
        garden_name: storedProfile.garden_name ?? DEFAULT_PROFILE.garden_name,
      });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.load'));
    }
  }

  async function handleSaveProfile() {
    try {
      setIsSaving(true);
      await saveProfile({
        name: cleanProfileValue(profile.name, t('settings.placeholder.gardener')),
        garden_name: cleanProfileValue(profile.garden_name, t('settings.placeholder.garden')),
      });
      await loadProfile();
      setFeedbackMessage(t('settings.feedback.profileSaved'));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.save'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestBackend() {
    try {
      setIsTestingBackend(true);
      setFeedbackMessage(null);
      const latest = await getLatest();
      setFeedbackMessage(t('settings.feedback.backendReachable', { value: formatLastUpdate(latest.last_update, language) }));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.backend'));
    } finally {
      setIsTestingBackend(false);
    }
  }

  function confirmResetProfile() {
    Alert.alert(t('settings.resetProfileTitle'), t('settings.resetProfileBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.resetProfileAction'),
        style: 'destructive',
        onPress: () => void handleResetProfile(),
      },
    ]);
  }

  function confirmClearSchedules() {
    Alert.alert(t('settings.clearSchedulesTitle'), t('settings.clearSchedulesBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.clearSchedulesAction'),
        style: 'destructive',
        onPress: () => void handleClearSchedules(),
      },
    ]);
  }

  async function handleClearSchedules() {
    try {
      await clearSchedules();
      setFeedbackMessage(t('settings.feedback.schedulesCleared'));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.clearSchedules'));
    }
  }

  async function handleResetProfile() {
    try {
      await resetProfile();
      await loadProfile();
      setFeedbackMessage(t('settings.feedback.profileReset'));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.reset'));
    }
  }

  async function handleLanguageChange(nextLanguage: AppLanguage) {
    try {
      await setLanguage(nextLanguage);
      setFeedbackMessage(t('settings.feedback.languageChanged'));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.error.language'));
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{t('settings.eyebrow')}</Text>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.body}>{t('settings.body')}</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{profile.garden_name || t('settings.placeholder.garden')}</Text>
              <Text style={styles.heroBody}>{t('home.welcome', { name: profile.name || t('settings.placeholder.gardener') })}</Text>
            </View>
            <StatusPill label={t('settings.serviceConfigured')} tone="good" />
          </View>
          <Text style={styles.heroMeta}>{DEVICE_ID}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.profile')}</Text>
          <ProfileInput
            label={t('settings.yourName')}
            onChangeText={(value) => setProfile((current) => ({ ...current, name: value }))}
            placeholder={t('settings.placeholder.gardener')}
            value={profile.name}
          />
          <ProfileInput
            label={t('settings.gardenNickname')}
            onChangeText={(value) => setProfile((current) => ({ ...current, garden_name: value }))}
            placeholder={t('settings.placeholder.garden')}
            value={profile.garden_name}
          />
          <Pressable disabled={isSaving} style={[styles.primaryButton, isSaving ? styles.disabled : null]} onPress={handleSaveProfile}>
            <Text style={styles.primaryButtonText}>{isSaving ? t('settings.saving') : t('settings.saveProfile')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.connection')}</Text>
          <InfoRow label={t('settings.device')} value={DEVICE_ID} />
          <InfoRow label={t('settings.service')} value={getFriendlyApiStatus(t)} />
          <Text style={styles.apiHint} numberOfLines={2}>
            {getConfiguredApiBaseUrl() || t('settings.noApiUrl')}
          </Text>
          <Pressable
            disabled={isTestingBackend}
            style={[styles.secondaryButton, isTestingBackend ? styles.disabled : null]}
            onPress={() => void handleTestBackend()}
          >
            <Text style={styles.secondaryButtonText}>{isTestingBackend ? t('settings.testing') : t('settings.testBackend')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.language')}</Text>
          <Text style={styles.cardBody}>{t('settings.languageBody')}</Text>
          <View style={styles.languageRow}>
            <LanguageButton
              active={language === 'en'}
              label={t('settings.language.english')}
              onPress={() => void handleLanguageChange('en')}
            />
            <LanguageButton
              active={language === 'ro'}
              label={t('settings.language.romanian')}
              onPress={() => void handleLanguageChange('ro')}
            />
          </View>
        </View>

        {feedbackMessage ? (
          <View style={styles.feedbackCard}>
            <StatusPill label={t('common.saved')} tone="good" />
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <StatusPill label={t('common.needsAttention')} tone="warning" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>{t('settings.localData')}</Text>
          <Text style={styles.dangerBody}>{t('settings.localDataBody')}</Text>
          <Pressable style={styles.dangerButton} onPress={confirmResetProfile}>
            <Text style={styles.dangerButtonText}>{t('settings.resetLocalProfile')}</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={confirmClearSchedules}>
            <Text style={styles.dangerButtonText}>{t('settings.clearLocalSchedules')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileInput({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aad88"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LanguageButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.languageButton, active ? styles.languageButtonActive : null]} onPress={onPress}>
      <Text style={[styles.languageButtonText, active ? styles.languageButtonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function cleanProfileValue(value: string, fallback: string): string {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function getFriendlyApiStatus(t: (key: string, params?: Record<string, string | number>) => string): string {
  return getConfiguredApiBaseUrl() ? t('settings.serviceConfigured') : t('settings.serviceNeedsApi');
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
  heroCard: {
    backgroundColor: '#2f6f3e',
    borderRadius: 28,
    marginTop: 18,
    padding: 20,
  },
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    color: '#f5fff1',
    fontSize: 22,
    fontWeight: '900',
  },
  heroBody: {
    color: '#d8edd8',
    fontSize: 15,
    marginTop: 6,
  },
  heroMeta: {
    color: '#c5e3c5',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
  },
  card: {
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
  cardBody: {
    color: '#667761',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  inputGroup: {
    marginTop: 16,
  },
  label: {
    color: '#48624a',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f7ec',
    borderColor: '#d6e5cf',
    borderRadius: 18,
    borderWidth: 1,
    color: '#203522',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 18,
    marginTop: 18,
    padding: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e8f3de',
    borderRadius: 18,
    marginTop: 16,
    padding: 15,
  },
  secondaryButtonText: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.6,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  infoLabel: {
    color: '#667761',
    fontSize: 14,
    fontWeight: '700',
  },
  infoValue: {
    color: '#203522',
    fontSize: 14,
    fontWeight: '900',
  },
  apiHint: {
    color: '#71816c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  languageButton: {
    backgroundColor: '#eff6ea',
    borderColor: '#d6e5cf',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  languageButtonActive: {
    backgroundColor: '#2f6f3e',
    borderColor: '#2f6f3e',
  },
  languageButtonText: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  languageButtonTextActive: {
    color: '#ffffff',
  },
  feedbackCard: {
    backgroundColor: '#dff4c8',
    borderRadius: 24,
    gap: 10,
    marginTop: 16,
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
    gap: 10,
    marginTop: 16,
    padding: 18,
  },
  errorText: {
    color: '#8a4b20',
    fontSize: 15,
    lineHeight: 21,
  },
  dangerCard: {
    backgroundColor: '#fff4ea',
    borderColor: '#f2d7bc',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  dangerTitle: {
    color: '#6a3d16',
    fontSize: 18,
    fontWeight: '900',
  },
  dangerBody: {
    color: '#8a5a34',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#6f2e17',
    borderRadius: 16,
    marginTop: 16,
    padding: 14,
  },
  dangerButtonText: {
    color: '#fffaf5',
    fontSize: 15,
    fontWeight: '900',
  },
});
