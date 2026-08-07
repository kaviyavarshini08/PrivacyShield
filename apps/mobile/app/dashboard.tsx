import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
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

  const quickLinks = [
    { title: 'Workspace', icon: 'folder-multiple-outline', route: '/workspace', color: '#6366f1' },
    { title: 'Queue', icon: 'tray-full', route: '/queue', color: '#3b82f6' },
    { title: 'Vault', icon: 'safe-square-outline', route: '/vault', color: '#10b981' },
    { title: 'RAG Search', icon: 'database-search', route: '/investigation', color: '#a855f7' },
    { title: 'Review', icon: 'check-decagram-outline', route: '/review', color: '#f59e0b' },
    { title: 'Compliance', icon: 'shield-account', route: '/compliance', color: '#8b5cf6' },
    { title: 'Analytics', icon: 'chart-box-outline', route: '/analytics', color: '#ec4899' },
    { title: 'Billing', icon: 'credit-card-outline', route: '/billing', color: '#06b6d4' },
    { title: 'Admin', icon: 'security', route: '/admin', color: '#ef4444' },
    { title: 'Settings', icon: 'cog-outline', route: '/settings', color: '#64748b' },
  ];

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

        {/* Primary Action Buttons */}
        <View style={styles.actionsContainer}>
          <CyberButton
            title="Upload Document"
            onPress={() => router.push('/upload')}
            style={styles.actionBtn}
          />
          <CyberButton
            title="AI Security Chat"
            onPress={() => router.push('/chat')}
            variant="secondary"
            style={[styles.actionBtn, { marginLeft: 12 }]}
          />
        </View>

        {/* All Web Feature Navigation Grid */}
        <Text style={styles.sectionTitle}>Security Suite Navigation</Text>
        <View style={styles.navGrid}>
          {quickLinks.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.navTile} onPress={() => router.push(item.route as any)}>
              <GlassCard style={styles.tileCard}>
                <IconButton icon={item.icon} iconColor={item.color} size={26} style={{ margin: 0 }} />
                <Text style={styles.tileTitle}>{item.title}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Processing Queue Section */}
        <Text style={styles.sectionTitle}>Active Processing Queue</Text>
        <GlassCard style={styles.listCard}>
          {queueLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />
          ) : queueItems && queueItems.length > 0 ? (
            queueItems.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() => router.push(`/analysis/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName}>{item.document?.original_name || item.name}</Text>
                  <Text style={styles.fileDetail}>Status: {(item.status || 'queued').toUpperCase()}</Text>
                </View>
                {item.status === 'processing' && (
                  <ActivityIndicator size="small" color="#3b82f6" />
                )}
                {item.status === 'completed' && (
                  <Text style={styles.statusCompleted}>{item.pii_found_count || 0} Leaks</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No active jobs in queue</Text>
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
    padding: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navTile: {
    width: '23%',
    marginBottom: 12,
  },
  tileCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tileTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
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
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
  syncBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
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
    backgroundColor: '#10b981',
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
