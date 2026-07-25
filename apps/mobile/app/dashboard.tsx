import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton, Portal, Dialog, Button, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useQueue, useVault } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function Dashboard() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  
  const { data: queueItems, isLoading: queueLoading, refetch: refetchQueue } = useQueue();
  const { data: vaultItems, isLoading: vaultLoading, refetch: refetchVault } = useVault();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const onRefresh = () => {
    refetchQueue();
    refetchVault();
  };

  const totalVaultSize = vaultItems?.length || 0;
  const activeJobs = queueItems?.filter((item: any) => item.status === 'queued' || item.status === 'processing').length || 0;
  const totalLeaks = queueItems?.reduce((acc: number, item: any) => acc + (item.pii_found_count || 0), 0) || 0;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PRIVACY<Text style={{ color: '#3b82f6' }}>SHIELD</Text></Text>
          <Text style={styles.welcomeText}>Operator: {user?.fullName || user?.email}</Text>
        </View>
        <IconButton
          icon="logout"
          iconColor="#ef4444"
          size={24}
          onPress={handleLogout}
        />
      </View>

      {/* Sync status health bar */}
      <View style={styles.syncBar}>
        <View style={styles.syncIndicatorRow}>
          <View style={styles.syncDotContainer}>
            <View style={styles.syncDot} />
            <View style={styles.syncDotPulse} />
          </View>
          <Text style={styles.syncText}>SYNCED TO NODE: SECURE-3 (US-EAST)</Text>
        </View>
        <Text style={styles.syncLatency}>LATENCY: 14ms</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={queueLoading || vaultLoading} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <GlassCard style={[styles.metricCard, { borderTopWidth: 2, borderTopColor: '#3b82f6' }]}>
            <Text style={styles.metricVal}>{totalVaultSize}</Text>
            <Text style={styles.metricLabel}>Vault Items</Text>
          </GlassCard>

          <GlassCard style={[styles.metricCard, { borderTopWidth: 2, borderTopColor: '#ef4444' }]}>
            <Text style={[styles.metricVal, { color: '#ef4444' }]}>{totalLeaks}</Text>
            <Text style={styles.metricLabel}>PII Cleared</Text>
          </GlassCard>

          <GlassCard style={[styles.metricCard, { borderTopWidth: 2, borderTopColor: '#10b981' }]}>
            <Text style={[styles.metricVal, { color: '#10b981' }]}>{activeJobs}</Text>
            <Text style={styles.metricLabel}>Active Jobs</Text>
          </GlassCard>
        </View>

        {/* Action Row */}
        <View style={styles.actionsContainer}>
          <CyberButton
            title="Upload and Scan File"
            onPress={() => router.push('/upload')}
            style={styles.actionBtn}
          />
          <CyberButton
            title="Privacy Chat AI"
            onPress={() => router.push('/chat')}
            variant="secondary"
            style={[styles.actionBtn, { marginLeft: 12 }]}
          />
        </View>

        {/* Processing Queue Section */}
        <Text style={styles.sectionTitle}>Active Processing Queue</Text>
        <GlassCard style={styles.listCard}>
          {queueLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />
          ) : queueItems && queueItems.length > 0 ? (
            queueItems.map((item: any) => (
              <View key={item.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName}>{item.document.original_name}</Text>
                  <Text style={styles.fileDetail}>Status: {item.status.toUpperCase()}</Text>
                </View>
                {item.status === 'processing' && (
                  <ActivityIndicator size="small" color="#3b82f6" />
                )}
                {item.status === 'completed' && (
                  <Text style={styles.statusCompleted}>{item.pii_found_count || 0} Leaks</Text>
                )}
                {item.status === 'failed' && (
                  <Text style={styles.statusFailed}>Failed</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No documents in processing queue</Text>
          )}
        </GlassCard>

        {/* Redacted Vault Section */}
        <Text style={styles.sectionTitle}>Secured Vault</Text>
        <GlassCard style={styles.listCard}>
          {vaultLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />
          ) : vaultItems && vaultItems.length > 0 ? (
            vaultItems.map((item: any) => (
              <View key={item.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName}>{item.name}</Text>
                  <Text style={styles.fileDetail}>Size: {item.size} • Leaks Masked: {item.pii}</Text>
                </View>
                <IconButton
                  icon="shield-check"
                  iconColor="#10b981"
                  size={20}
                  onPress={() => alert(`Accessing file details in vault...`)}
                />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Vault is currently empty</Text>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Slate 950
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  welcomeText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  scrollContainer: {
    padding: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    flex: 0.31,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  listCard: {
    marginBottom: 24,
    padding: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f8fafc',
  },
  fileDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusCompleted: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  statusFailed: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  syncBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a', // slate 900
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  syncIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDotContainer: {
    width: 8,
    height: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981', // green 500
  },
  syncDotPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    opacity: 0.4,
  },
  syncText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  syncLatency: {
    color: '#3b82f6',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
});
