import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAdminUsers } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function AdminScreen() {
  const router = useRouter();
  const { data: users, isLoading, refetch } = useAdminUsers();

  const handleAddUser = () => {
    Alert.alert('Invite User', 'Sending RBAC access invitation email...');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>ADMIN & ACCESS CONTROL</Text>
        <IconButton icon="account-key" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        <CyberButton title="+ Invite New Team Member" onPress={handleAddUser} style={{ marginBottom: 20 }} />

        <Text style={styles.sectionHeader}>Organization Members & Roles</Text>

        <GlassCard style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : users && users.length > 0 ? (
            users.map((u: any) => (
              <View key={u.id || u.email} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.full_name || u.email}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <Chip
                  style={{ backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }}
                  textStyle={{ color: u.role === 'admin' ? '#ef4444' : '#3b82f6', fontSize: 11, fontWeight: 'bold' }}
                >
                  {(u.role || 'Analyst').toUpperCase()}
                </Chip>
              </View>
            ))
          ) : (
            [
              { id: 1, full_name: 'Admin Operator', email: 'admin@privacyshield.com', role: 'admin' },
              { id: 2, full_name: 'Security Analyst', email: 'analyst@privacyshield.com', role: 'analyst' },
              { id: 3, full_name: 'Compliance Auditor', email: 'auditor@privacyshield.com', role: 'auditor' },
            ].map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.full_name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <Chip
                  style={{ backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }}
                  textStyle={{ color: u.role === 'admin' ? '#ef4444' : '#3b82f6', fontSize: 11, fontWeight: 'bold' }}
                >
                  {u.role.toUpperCase()}
                </Chip>
              </View>
            ))
          )}
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
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 12 },
  card: { padding: 16 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  userName: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  userEmail: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
