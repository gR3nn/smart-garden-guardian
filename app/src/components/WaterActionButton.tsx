import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface WaterActionButtonProps {
  title: string;
  subtitle: string;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'water' | 'active' | 'danger';
  onPress: () => void;
}

export function WaterActionButton({
  title,
  subtitle,
  disabled = false,
  loading = false,
  tone = 'water',
  onPress,
}: WaterActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'danger' ? styles.dangerButton : tone === 'active' ? styles.activeButton : styles.waterButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading ? styles.pressed : null,
      ]}
    >
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            tone === 'danger' ? styles.dangerTitle : tone === 'active' ? styles.activeTitle : styles.waterTitle,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            tone === 'danger' ? styles.dangerSubtitle : tone === 'active' ? styles.activeSubtitle : styles.waterSubtitle,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={tone === 'danger' ? '#7f1d1d' : tone === 'active' ? '#95651b' : '#1f5c38'} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  waterButton: {
    backgroundColor: '#dff4c8',
    borderColor: '#b7df9c',
    borderWidth: 1,
  },
  activeButton: {
    backgroundColor: '#fff0c7',
    borderColor: '#f0ca7e',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: '#ffe0d3',
    borderColor: '#f2a58a',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.58,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  textBlock: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  waterTitle: {
    color: '#203522',
  },
  activeTitle: {
    color: '#7a4e11',
  },
  dangerTitle: {
    color: '#7f1d1d',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  waterSubtitle: {
    color: '#52634d',
  },
  activeSubtitle: {
    color: '#95651b',
  },
  dangerSubtitle: {
    color: '#9a3412',
  },
});
