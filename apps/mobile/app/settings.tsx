import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, IconButton, Switch, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useUpdateProfile, useChangePassword } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [strictUpload, setStrictUpload] = useState(false);
  const [apiKey, setApiKey] = useState('ps_live_9948271038592014');

  // Profile Edit
  const [fullName, setFullName] = useState(user?.fullName || '');
  const updateProfile = useUpdateProfile();

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePassword = useChangePassword();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
    }
  }, [user]);

  const handleGenerateKey = () => {
    const newKey = `ps_live_${Math.random().toString(36).substring(2, 18)}`;
    setApiKey(newKey);
    Alert.alert('New API Key Generated', newKey);
  };

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid full name.');
      return;
    }
    updateProfile.mutate(
      { full_name: fullName.trim() },
      {
        onSuccess: async () => {
          Alert.alert('Success', 'Profile name updated successfully.');
          await checkAuth(); // refresh user context
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.detail || 'Failed to update profile.');
        }
      }
    );
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please enter current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Password updated! Please log in with your new password.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => {
            logout();
            router.replace('/login');
          }, 1500);
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.detail || 'Failed to change password. Verify your current password.');
        }
      }
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>SETTINGS & SECURITY</Text>
        <IconButton icon="cog" iconColor="#3b82f6" size={22} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Profile Card */}
        <Text style={styles.sectionHeader}>Profile Information</Text>
        <GlassCard style={styles.card}>
          <TextInput
            mode="outlined"
            label="Email Address (Read-only)"
            value={user?.email || ''}
            editable={false}
            outlineColor="rgba(255, 255, 255, 0.1)"
            textColor="#94a3b8"
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
          />
          <TextInput
            mode="outlined"
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
          />
          <CyberButton 
            title={updateProfile.isPending ? "Saving..." : "Save Profile"} 
            onPress={handleSaveProfile} 
            disabled={updateProfile.isPending}
          />
        </GlassCard>

        {/* Change Password Card */}
        <Text style={styles.sectionHeader}>Change Password</Text>
        <GlassCard style={styles.card}>
          <TextInput
            mode="outlined"
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
          />
          <TextInput
            mode="outlined"
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
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
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
          />
          <CyberButton 
            title={changePassword.isPending ? "Updating..." : "Update Password"} 
            onPress={handleChangePassword}
            disabled={changePassword.isPending}
          />
        </GlassCard>

        {/* Security Controls */}
        <Text style={styles.sectionHeader}>Security Controls</Text>
        <GlassCard style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Two-Factor Authentication (2FA)</Text>
              <Text style={styles.switchDesc}>Require TOTP authenticator code on login</Text>
            </View>
            <Switch value={mfaEnabled} onValueChange={setMfaEnabled} color="#3b82f6" />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Automatic Session Lock</Text>
              <Text style={styles.switchDesc}>Lock app after 5 minutes of inactivity</Text>
            </View>
            <Switch value={autoLock} onValueChange={setAutoLock} color="#3b82f6" />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Strict File Type Filter</Text>
              <Text style={styles.switchDesc}>Only accept encrypted PDF & TXT documents</Text>
            </View>
            <Switch value={strictUpload} onValueChange={setStrictUpload} color="#3b82f6" />
          </View>
        </GlassCard>

        {/* API Key Access */}
        <Text style={styles.sectionHeader}>Developer API Credentials</Text>
        <GlassCard style={styles.card}>
          <TextInput
            mode="outlined"
            label="Active Secret API Key"
            value={apiKey}
            editable={false}
            outlineColor="rgba(59, 130, 246, 0.3)"
            activeOutlineColor="#3b82f6"
            textColor="#ffffff"
            style={{ backgroundColor: '#0f172a', marginBottom: 12 }}
          />
          <CyberButton title="Rotate API Key" onPress={handleGenerateKey} variant="secondary" />
        </GlassCard>
      </ScrollView>
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
  scrollContainer: { padding: 20 },
  card: { padding: 18, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6', marginBottom: 10 },
  userVal: { fontSize: 13, color: '#f8fafc', marginVertical: 3 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  switchTitle: { fontSize: 13, fontWeight: '600', color: '#f8fafc' },
  switchDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
