import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';

interface CyberButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6', // Cyber Blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  secondary: {
    backgroundColor: '#10b981', // Emerald
    shadowColor: '#10b981',
  },
  danger: {
    backgroundColor: '#ef4444', // Red
    shadowColor: '#ef4444',
  },
  disabled: {
    backgroundColor: '#4b5563',
    opacity: 0.6,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
