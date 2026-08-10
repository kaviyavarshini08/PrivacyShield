import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQueue } from '../src/api/query';
import { CyberButton } from '@privacyshield/ui';

export default function ProcessingQueue() {
  const router = useRouter();
  const { data: queueItems, isLoading, refetch } = useQueue();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#059669'; // emerald
      case 'processing': return '#0284c7'; // sky/blue
      case 'queued': return '#475569'; // slate
      case 'failed': return '#dc2626'; // red
      default: return '#475569';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#d1fae5';
      case 'processing': return '#e0f2fe';
      case 'queued': return '#f1f5f9';
      case 'failed': return '#fee2e2';
      default: return '#f1f5f9';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'check-circle-outline';
      case 'processing': return 'loading'; // or sync
      case 'queued': return 'clock-outline';
      case 'failed': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const completed = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'completed').length || 0;
  const processing = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'processing').length || 0;
  const queued = queueItems?.filter((i: any) => (!i.status || i.status?.toLowerCase() === 'queued')).length || 0;
  const failed = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'failed').length || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} />
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={styles.headerTitle}>Processing Queue</Text>
          <Text style={styles.headerSub}>Track document processing status and results</Text>
        </View>
        <IconButton icon="refresh" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        {/* 2x2 Metrics Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
              <IconButton icon="check-circle-outline" iconColor="#059669" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{completed}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }]}>
              <IconButton icon="sync" iconColor="#2563eb" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{processing}</Text>
              <Text style={styles.metricLabel}>Processing</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
              <IconButton icon="clock-outline" iconColor="#475569" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{queued}</Text>
              <Text style={styles.metricLabel}>In Queue</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
              <IconButton icon="alert-circle-outline" iconColor="#dc2626" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{failed}</Text>
              <Text style={styles.metricLabel}>Failed</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          {isLoading && (!queueItems || queueItems.length === 0) ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : queueItems && queueItems.length > 0 ? (
            queueItems.map((item: any, idx: number) => {
              const uploader = item.document?.owner_id ? `User #${item.document.owner_id}` : 'System';
              const statusColor = getStatusColor(item.status);
              return (
                <View key={item.id} style={[styles.queueRow, idx === queueItems.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                  <View style={styles.rowHeader}>
                    <View style={styles.rowTitleContainer}>
                      <IconButton 
                        icon={getStatusIcon(item.status)} 
                        iconColor={statusColor} 
                        size={20} 
                        style={{ margin: 0, marginRight: 8 }} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.document?.original_name || item.name || `Document #${item.id}`}</Text>
                        <Text style={styles.itemSub}>Uploaded by: {uploader}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.rowDetails}>
                    <Chip 
                      style={{ backgroundColor: getStatusBgColor(item.status), height: 26 }} 
                      textStyle={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}
                    >
                      {(item.status || 'queued').toUpperCase()}
                    </Chip>
                    <Text style={styles.piiText}>PII Found: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.pii_found_count !== undefined && item.pii_found_count !== null ? item.pii_found_count : '—'}</Text></Text>
                  </View>
                  
                  <View style={styles.rowFooter}>
                    <Text style={styles.footerText}>{new Date(item.queued_at || item.created_at || Date.now()).toLocaleString()}</Text>
                    {item.status?.toLowerCase() === 'completed' && (
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => router.push(`/analysis/${item.id}` as any)}
                      >
                        <IconButton icon="eye" iconColor="#1E3A8A" size={16} style={{ margin: 0, marginRight: 4 }} />
                        <Text style={{ color: '#1E3A8A', fontSize: 12, fontWeight: '600' }}>View</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '500' }}>
                No documents in the processing queue.
              </Text>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#1E3A8A' }]} onPress={() => router.push('/upload')}>
                <Text style={styles.primaryButtonText}>Upload New Document</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  scrollContainer: { padding: 20 },
  card: { 
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricIconWrap: { 
    width: 36, 
    height: 36, 
    borderRadius: 8, 
    borderWidth: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 10,
  },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  metricLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', marginTop: 2 },
  queueRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 28,
  },
  piiText: { fontSize: 12, color: '#64748b' },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 28,
  },
  footerText: { fontSize: 11, color: '#64748b' },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  primaryButton: {
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  }
});
