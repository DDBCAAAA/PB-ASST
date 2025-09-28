import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ConfidenceBadge = ({ score }) => {
  const percentage = score != null ? Math.round(score * 100) : null;
  const level = percentage == null ? '—' : `${percentage}%`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PB Confidence</Text>
      <View style={styles.badge}>
        <Text style={styles.value}>{level}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f6cbd1a',
    borderWidth: 2,
    borderColor: '#0f6cbd',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f6cbd',
  },
});

export default ConfidenceBadge;
