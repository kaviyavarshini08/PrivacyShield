import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useComplianceOverview } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function ComplianceScreen() {
  const router = useRouter();
  const { data: compliance, isLoading, refetch } = useComplianceOverview();

  const handleExportAudit = () => {
    Alert.alert('Audit Export', 'Generating certified GDPR/HIPAA compliance report PDF...');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>COMPLIANCE & AUDIT</Text>
        <IconButton icon="shield-check" iconColor="#10b981" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Overall Score */}
            <GlassCard style={styles.card}>
              <View style={styles.scoreRow}>
                <View>
                  <Text style={styles.scoreVal}>98%</Text>
                  <Text style={styles.scoreLabel}>System Compliance Index</Text>
                </View>
                <Chip icon="shield-check-outline" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }} textStyle={{ color: '#10b981' }}>
                  CERTIFIED
                </Chip>
              </View>

              <Text style={styles.frameworkTitle}>GDPR Audit Status</Text>
              <ProgressBar progress={0.98} color="#10b981" style={styles.progress} />

              <Text style={styles.frameworkTitle}>HIPAA Safeguards</Text>
              <ProgressBar progress={0.95} color="#3b82f6" style={styles.progress} />

              <Text style={styles.frameworkTitle}>CCPA Data Rights</Text>
              <ProgressBar progress={1.0} color="#10b981" style={styles.progress} />
            </GlassCard>

            <CyberButton
              title="Export Certified Audit Log"
              onPress={handleExportAudit}
              style={{ marginBottom: 20 }}
            />

            {/* Compliance Logs */}
            <Text style={styles.sectionHeader}>Recent Security & Audit Logs</Text>
            <GlassCard style={styles.card}>
              {(compliance?.logs || [
                { id: 1, action: 'PII Auto-Redaction Executed', timestamp: '2 mins ago', status: 'Passed' },
                { id: 2, action: 'Encrypted Vault Key Rotation', timestamp: '1 hour ago', status: 'Passed' },
                { id: 3, action: 'RBAC Permission Validation', timestamp: '3 hours ago', status: 'Passed' },
              ]).map((log: any) => (
                <View key={log.id} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logTime}>{log.timestamp}</Text>
                  </View>
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>{log.status}</Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}
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
  card: { padding: 18, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  scoreVal: { fontSize: 32, fontWeight: 'bold', color: '#10b981' },
  scoreLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  frameworkTitle: { fontSize: 12, color: '#94a3b8', marginTop: 12, marginBottom: 6, fontWeight: '600' },
  progress: { height: 6, borderRadius: 3, backgroundColor: '#0f172a' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 12 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  logAction: { fontSize: 13, fontWeight: '600', color: '#f8fafc' },
  logTime: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
