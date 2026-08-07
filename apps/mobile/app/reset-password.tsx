import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useResetPassword } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const resetPassword = useResetPassword();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!token) {
      Alert.alert('Error', 'Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = () => {
    if (!token) {
      Alert.alert('Error', 'Reset token is missing.');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    resetPassword.mutate(
      { token: Array.isArray(token) ? token[0] : token, new_password: newPassword },
      {
        onSuccess: (data) => {
          Alert.alert('Success', data?.message || 'Password updated successfully!');
          setIsCompleted(true);
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.detail || 'Failed to reset password. Token may be expired.');
        }
      }
    );
  };

  if (isCompleted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <IconButton icon="check-circle" iconColor="#10b981" size={64} />
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>Reset Complete!</Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
          Your password has been successfully updated.
        </Text>
        <CyberButton title="Proceed to Login" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>SET NEW PASSWORD</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>PrivacyShield Security Verification</Text>
        
        <GlassCard style={styles.card}>
          <TextInput
            mode="outlined"
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 16 }}
          />
          <TextInput
            mode="outlined"
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 24 }}
          />

          <CyberButton 
            title={resetPassword.isPending ? "Updating..." : "Reset Password"} 
            onPress={handleSubmit} 
            disabled={resetPassword.isPending || !token}
          />
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24, textAlign: 'center' },
  card: { padding: 24 },
});
