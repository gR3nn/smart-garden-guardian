import { StyleSheet, Text, View } from 'react-native';

interface FriendlySensorCardProps {
  label: string;
  value: string;
  helper: string;
  accentColor?: string;
}

export function FriendlySensorCard({ label, value, helper, accentColor = '#2f6f3e' }: FriendlySensorCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 24,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 142,
    padding: 18,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    marginBottom: 14,
    width: 10,
  },
  label: {
    color: '#667761',
    fontSize: 13,
    fontWeight: '800',
  },
  value: {
    color: '#203522',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 7,
  },
  helper: {
    color: '#71816c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
