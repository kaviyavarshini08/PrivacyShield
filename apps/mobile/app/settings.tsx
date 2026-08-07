import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, IconButton, Switch, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [strictUpload, setStrictUpload] = useState(false);
  const [apiKey, setApiKey] = useState('ps_live_9948271038592014');

  const handleGenerateKey = () => {
    const newKey = `ps_live_${Math.random().toString(36).substring(2, 18)}`;
    setApiKey(newKey);
    Alert.alert('New API Key Generated', newKey);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>SETTINGS & SECURITY</Text>
        <IconButton icon="cog" iconColor="#3b82f6" size={22} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Card */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>User Account Profile</Text>
          <Text style={styles.userVal}>Operator Name: {user?.fullName || 'Security Operator'}</Text>
          <Text style={styles.userVal}>Email: {user?.email || 'operator@privacyshield.com'}</Text>
          <Text style={styles.userVal}>Role: {user?.role || 'Admin'}</Text>
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
    </View>
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
