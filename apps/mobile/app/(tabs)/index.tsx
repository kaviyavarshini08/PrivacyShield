import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useQueue, useVault, useAnalytics } from '../../src/api/query';
import { CyberButton } from '@privacyshield/ui';

export default function Dashboard() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  
  const { data: queueItems, isLoading: queueLoading, refetch: refetchQueue } = useQueue();
  const { data: vaultItems, isLoading: vaultLoading, refetch: refetchVault } = useVault();
  const { data: dashboardData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalytics();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const onRefresh = () => {
    refetchQueue();
    refetchVault();
    refetchAnalytics();
  };

  const vaultCount = vaultItems?.length || 0;
  const queueDocsCount = queueItems?.length || 0;
  const queuePiiCount = queueItems?.reduce((acc: number, q: any) => acc + (q.pii_found_count || 0), 0) || 0;

  const totalDocs = dashboardData?.total_documents ?? queueDocsCount;
  const totalEntities = dashboardData?.total_entities_found ?? queuePiiCount;
  const entityCounts: Record<string, number> = dashboardData?.entity_counts || {};

  const getEntityCount = (keys: string[]) => {
    let count = 0;
    Object.entries(entityCounts).forEach(([k, v]) => {
      const upperK = k.toUpperCase();
      if (keys.some(key => upperK.includes(key.toUpperCase()))) {
        count += Number(v) || 0;
      }
    });
    return count;
  };

  const aadhaarCount = getEntityCount(['AADHAAR', 'IN_AADHAAR']);
  const panCount = getEntityCount(['PAN', 'IN_PAN']);
  const phoneCount = getEntityCount(['PHONE', 'MOBILE', 'PHONE_NUMBER']);
  const emailCount = getEntityCount(['EMAIL', 'EMAIL_ADDRESS']);
  const secretCount = getEntityCount(['SECRET', 'KEY', 'API', 'TOKEN', 'CREDENTIAL', 'PASSWORD']);

  const piiBreakdownData = [
    { type: 'Aadhaar (National ID)', count: aadhaarCount, color: '#06b6d4' },
    { type: 'PAN Card (Tax ID)', count: panCount, color: '#14b8a6' },
    { type: 'Phone Number', count: phoneCount, color: '#f59e0b' },
    { type: 'Email Address', count: emailCount, color: '#10b981' },
    { type: 'High Entropy Secrets', count: secretCount, color: '#ef4444' },
  ];

  Object.entries(entityCounts).forEach(([k, v]) => {
    const cleanName = k.replace('IN_', '').replace('_', ' ');
    const isAlreadyCategorized = ['AADHAAR', 'PAN', 'PHONE', 'EMAIL', 'SECRET', 'KEY'].some(x => k.toUpperCase().includes(x));
    if (!isAlreadyCategorized) {
      piiBreakdownData.push({
        type: cleanName,
        count: Number(v) || 0,
        color: '#8b5cf6'
      });
    }
  });

  const activePIIData = piiBreakdownData
    .filter(item => item.count > 0)
    .map(item => ({
      ...item,
      percentage: totalEntities > 0 ? Math.round((item.count / totalEntities) * 1000) / 10 : 0
    }));

  const quickLinks = [
    { title: 'Queue', icon: 'tray-full', route: '/queue', color: '#3b82f6' },
    { title: 'Vault', icon: 'safe-square-outline', route: '/vault', color: '#10b981' },
    { title: 'Compliance', icon: 'shield-account', route: '/compliance', color: '#8b5cf6' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.webHeader}>
        <View style={styles.webHeaderTop}>
          <View style={styles.webHeaderLeft}>
            <View style={styles.securityOpsRow}>
              <View style={styles.cyanDot} />
              <Text style={styles.securityOpsText}>SECURITY OPERATIONS</Text>
            </View>
            <Text style={styles.webHeaderTitle}>PrivacyShield Operations</Text>
            <Text style={styles.webHeaderSub}>Real-time SaaS multitenant threat intelligence and PII scanning metrics.</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: '#0f766e', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginTop: 4
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
              {(user?.full_name || user?.fullName || 'U').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={queueLoading || vaultLoading || analyticsLoading} onRefresh={onRefresh} tintColor="#06b6d4" />
        }
      >
        <View style={styles.webMetricsGrid}>
          {/* Metric 1 */}
          <View style={styles.webMetricCard}>
            <View style={styles.webMetricHeader}>
              <View style={[styles.webMetricIconBox, { backgroundColor: '#cffafe', borderColor: '#a5f3fc' }]}>
                <Feather name="file-text" size={20} color="#0891b2" />
              </View>
              <View style={[styles.webMetricPill, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.webMetricPillText, { color: '#059669' }]}>Live</Text>
              </View>
            </View>
            <View style={styles.webMetricContent}>
              <Text style={styles.webMetricVal}>{totalDocs}</Text>
              <Text style={styles.webMetricLabel}>PROCESSED DOCUMENTS</Text>
            </View>
          </View>

          {/* Metric 2 */}
          <View style={styles.webMetricCard}>
            <View style={styles.webMetricHeader}>
              <View style={[styles.webMetricIconBox, { backgroundColor: '#ccfbf1', borderColor: '#99f6e4' }]}>
                <Feather name="shield" size={20} color="#0d9488" />
              </View>
              <View style={[styles.webMetricPill, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.webMetricPillText, { color: '#059669' }]}>Live</Text>
              </View>
            </View>
            <View style={styles.webMetricContent}>
              <Text style={styles.webMetricVal}>{totalEntities}</Text>
              <Text style={styles.webMetricLabel}>SENSITIVE ITEMS FOUND</Text>
            </View>
          </View>

          {/* Metric 3 */}
          <View style={styles.webMetricCard}>
            <View style={styles.webMetricHeader}>
              <View style={[styles.webMetricIconBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Feather name="lock" size={20} color="#d97706" />
              </View>
              <View style={[styles.webMetricPill, { backgroundColor: '#cffafe', borderColor: '#a5f3fc' }]}>
                <Text style={[styles.webMetricPillText, { color: '#0891b2' }]}>Live</Text>
              </View>
            </View>
            <View style={styles.webMetricContent}>
              <Text style={styles.webMetricVal}>{vaultCount}</Text>
              <Text style={styles.webMetricLabel}>VAULT QUARANTINE FILES</Text>
            </View>
          </View>

          {/* Metric 4 */}
          <View style={styles.webMetricCard}>
            <View style={styles.webMetricHeader}>
              <View style={[styles.webMetricIconBox, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                <Feather name="alert-triangle" size={20} color="#dc2626" />
              </View>
              <View style={[styles.webMetricPill, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.webMetricPillText, { color: '#059669' }]}>Optimal</Text>
              </View>
            </View>
            <View style={styles.webMetricContent}>
              <Text style={styles.webMetricVal}>0</Text>
              <Text style={styles.webMetricLabel}>ACTIVE TRAVEL ANOMALIES</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#1E3A8A', marginRight: 12 }]} onPress={() => router.push('/upload')}>
            <Text style={styles.primaryButtonText}>Upload Document</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic PII Breakdown */}
        <View style={styles.sectionHeader}>
          <Feather name="shield" size={18} color="#0d9488" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>PII Detection Vectors</Text>
        </View>
        <View style={styles.listCard}>
          {activePIIData.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <IconButton icon="shield-outline" iconColor="#94a3b8" size={32} />
              <Text style={{ color: '#475569', fontSize: 13, marginTop: 4, fontWeight: '500' }}>No PII detected yet</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Upload a document to see detection results.</Text>
            </View>
          ) : (
            activePIIData.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: '600' }}>{item.type}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: 'bold', marginRight: 8 }}>{item.count}</Text>
                    <Text style={{ color: '#0891b2', fontSize: 12 }}>{item.percentage}%</Text>
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: item.color, borderRadius: 3 }} />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Feather name="grid" size={18} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Security Suite Navigation</Text>
        </View>
        <View style={styles.navGrid}>
          {quickLinks.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.navTile} onPress={() => router.push(item.route as any)}>
              <View style={styles.tileCard}>
                <IconButton icon={item.icon} iconColor={item.color} size={26} style={{ margin: 0 }} />
                <Text style={styles.tileTitle}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Feather name="list" size={18} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Active Processing Queue</Text>
        </View>
        <View style={styles.listCard}>
          {queueLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />
          ) : queueItems && queueItems.length > 0 ? (
            queueItems.map((item: any, idx: number) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.listItem, idx === queueItems.length - 1 ? { borderBottomWidth: 0 } : {}]}
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Light gray background
    paddingTop: 48,
  },
  scrollContainer: {
    padding: 20,
  },
  webHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Light border
    backgroundColor: '#ffffff', // White header
  },
  webHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  webHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  securityOpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cyanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
    marginRight: 6,
  },
  securityOpsText: {
    color: '#0891b2',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  webHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  webHeaderSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  webMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  webMetricCard: {
    width: '48%',
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff', // White cards
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0', // Light border
  },
  webMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  webMetricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  webMetricPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  webMetricPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  webMetricContent: {
    marginTop: 12,
  },
  webMetricVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  webMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navTile: {
    width: '31%',
    marginBottom: 12,
  },
  tileCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tileTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  listCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  fileDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusCompleted: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
});
