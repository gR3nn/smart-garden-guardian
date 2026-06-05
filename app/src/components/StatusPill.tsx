import { StyleSheet, Text, View } from 'react-native';

interface StatusPillProps {
  label: string;
  tone?: 'good' | 'warning' | 'neutral';
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  good: {
    backgroundColor: '#d9f2ce',
  },
  warning: {
    backgroundColor: '#ffe3b8',
  },
  neutral: {
    backgroundColor: '#e6ebdd',
  },
  text: {
    color: '#243326',
    fontSize: 13,
    fontWeight: '700',
  },
});
