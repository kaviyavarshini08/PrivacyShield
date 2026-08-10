import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, IconButton, TextInput, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useUpdateProfile, useChangePassword } from '../src/api/query';
import { Feather } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state: any) => state.user);
  const logout = useAuthStore((state: any) => state.logout);
  const checkAuth = useAuthStore((state: any) => state.checkAuth);

  const [activeTab, setActiveTab] = useState('Account');

  // Appearance
  const [themePreference, setThemePreference] = useState('Light');

  // Profile Edit
  const [fullName, setFullName] = useState(user?.full_name || user?.fullName || '');
  const updateProfile = useUpdateProfile();

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePassword = useChangePassword();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.fullName || '');
    }
  }, [user]);

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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // Dynamic Styles based on theme
  const isDark = themePreference === 'Dark';
  
  const dynStyles = {
    container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc', paddingTop: 48 },
    header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: isDark ? '#0f172a' : '#ffffff' },
    headerTitle: { fontSize: 24, fontWeight: '900' as const, color: isDark ? '#ffffff' : '#0f172a', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 },
    tabsContainer: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#e2e8f0',
      paddingBottom: 8
    },
    tabButtonActive: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
    tabTextActive: { color: isDark ? '#ffffff' : '#0f172a' },
    card: { 
      padding: 20, 
      marginBottom: 24,
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0'
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold' as const, color: isDark ? '#ffffff' : '#0f172a' },
    cardSub: { fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, lineHeight: 18 },
    profileNameText: { fontSize: 18, fontWeight: 'bold' as const, color: isDark ? '#ffffff' : '#0f172a' },
    profileEmailText: { fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 },
    input: { backgroundColor: isDark ? '#1e293b' : '#ffffff', marginBottom: 16, fontSize: 14 },
    themeRowTitle: { fontSize: 14, fontWeight: '600' as const, color: isDark ? '#ffffff' : '#0f172a' },
    themeSelector: {
      flexDirection: 'row' as const,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: 8,
      padding: 4,
    },
    themeBtnActive: {
      backgroundColor: isDark ? '#334155' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    themeBtnText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    themeBtnTextActive: {
      color: isDark ? '#ffffff' : '#0f172a',
    },
  };

  return (
    <KeyboardAvoidingView 
      style={dynStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={dynStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <IconButton icon="arrow-left" iconColor={isDark ? "#ffffff" : "#0f172a"} size={24} onPress={() => router.back()} style={{ marginLeft: -8, marginTop: 0, marginBottom: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={dynStyles.headerTitle}>System Settings</Text>
          </View>
          <TouchableOpacity 
            style={styles.signOutBtn}
            onPress={() => { logout(); router.replace('/login'); }}
          >
            <Feather name="log-out" size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <Text style={dynStyles.headerSub}>Manage your account preferences and application settings.</Text>
      </View>

      <View style={dynStyles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {['Account', 'Appearance', 'Security'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && dynStyles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Feather 
                name={tab === 'Account' ? 'user' : tab === 'Appearance' ? 'pen-tool' : 'shield'} 
                size={16} 
                color={activeTab === tab ? '#1e3a8a' : (isDark ? '#94a3b8' : '#64748b')} 
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, activeTab === tab && dynStyles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {activeTab === 'Account' && (
          <View style={dynStyles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={dynStyles.cardTitle}>Profile Information</Text>
                <Text style={dynStyles.cardSub}>Update your personal information and registered email address.</Text>
              </View>
              <Chip textStyle={{ color: '#10b981', fontSize: 10, fontWeight: 'bold' }} style={{ backgroundColor: '#ecfdf5', height: 24, borderRadius: 4 }}>
                VERIFIED USER
              </Chip>
            </View>

            <View style={styles.profileBadgeRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.full_name || user?.fullName || '')}</Text>
              </View>
              <View>
                <Text style={dynStyles.profileNameText}>{user?.full_name || user?.fullName || 'User'}</Text>
                <Text style={dynStyles.profileEmailText}>{user?.email || 'email@example.com'}</Text>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              outlineColor={isDark ? "#334155" : "#e2e8f0"}
              activeOutlineColor="#3b82f6"
              textColor={isDark ? "#ffffff" : "#0f172a"}
              style={dynStyles.input}
            />
            <TextInput
              mode="outlined"
              label="Email Address (Read-only)"
              value={user?.email || ''}
              editable={false}
              outlineColor={isDark ? "#334155" : "#e2e8f0"}
              textColor={isDark ? "#94a3b8" : "#64748b"}
              style={dynStyles.input}
            />

            <TouchableOpacity 
              style={[styles.primaryButton, { alignSelf: 'flex-start', marginTop: 12, opacity: updateProfile.isPending ? 0.7 : 1 }]}
              onPress={handleSaveProfile}
              disabled={updateProfile.isPending}
            >
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Appearance' && (
          <View style={dynStyles.card}>
            <View style={{ marginBottom: 20 }}>
              <Text style={dynStyles.cardTitle}>Appearance & Theme</Text>
              <Text style={dynStyles.cardSub}>Customize how PrivacyShield looks on your device.</Text>
            </View>

            <View style={styles.themeRow}>
              <View style={{ flex: 1 }}>
                <Text style={dynStyles.themeRowTitle}>Theme Preference</Text>
                <Text style={dynStyles.cardSub}>Select light, dark, or system default.</Text>
              </View>
              
              <View style={dynStyles.themeSelector}>
                {['Light', 'Dark', 'System'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    style={[styles.themeBtn, themePreference === t && dynStyles.themeBtnActive]}
                    onPress={() => setThemePreference(t)}
                  >
                    <Text style={[dynStyles.themeBtnText, themePreference === t && dynStyles.themeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Security' && (
          <View style={dynStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Feather name="key" size={20} color="#1e3a8a" style={{ marginRight: 8 }} />
              <View>
                <Text style={dynStyles.cardTitle}>Change Password</Text>
                <Text style={dynStyles.cardSub}>Update your login password securely.</Text>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              outlineColor={isDark ? "#334155" : "#e2e8f0"}
              activeOutlineColor="#3b82f6"
              textColor={isDark ? "#ffffff" : "#0f172a"}
              style={dynStyles.input}
            />

            <TextInput
              mode="outlined"
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              outlineColor={isDark ? "#334155" : "#e2e8f0"}
              activeOutlineColor="#3b82f6"
              textColor={isDark ? "#ffffff" : "#0f172a"}
              style={dynStyles.input}
            />

            <TextInput
              mode="outlined"
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              outlineColor={
                confirmPassword && confirmPassword !== newPassword
                  ? '#ef4444'
                  : confirmPassword && confirmPassword === newPassword
                  ? '#10b981'
                  : (isDark ? "#334155" : "#e2e8f0")
              }
              activeOutlineColor={
                confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '#10b981'
              }
              textColor={isDark ? "#ffffff" : "#0f172a"}
              style={dynStyles.input}
            />

            {/* Live match indicator */}
            {confirmPassword.length > 0 && (
              <Text style={{
                fontSize: 12,
                marginTop: -12,
                marginBottom: 16,
                fontWeight: '600',
                color: confirmPassword === newPassword ? '#10b981' : '#ef4444'
              }}>
                {confirmPassword === newPassword
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, {
                alignSelf: 'flex-start',
                marginTop: 4,
                backgroundColor: '#8b5cf6',
                opacity: (changePassword.isPending || (confirmPassword.length > 0 && confirmPassword !== newPassword)) ? 0.5 : 1
              }]}
              onPress={handleChangePassword}
              disabled={changePassword.isPending || (confirmPassword.length > 0 && confirmPassword !== newPassword)}
            >
              <Text style={styles.primaryButtonText}>
                {changePassword.isPending ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollContainer: { padding: 20 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
