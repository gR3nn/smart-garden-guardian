import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#fbfff6',
    borderColor: '#ddebd5',
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    color: '#203522',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#71816c',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
