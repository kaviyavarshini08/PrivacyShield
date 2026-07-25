import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)', // Dark transparent background
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
