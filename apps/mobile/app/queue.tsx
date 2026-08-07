import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQueue } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function ProcessingQueue() {
  const router = useRouter();
  const { data: queueItems, isLoading, refetch } = useQueue();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'processing': return '#3b82f6';
      case 'queued': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const completed = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'completed').length || 0;
  const processing = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'processing').length || 0;
  const queued = queueItems?.filter((i: any) => (!i.status || i.status?.toLowerCase() === 'queued')).length || 0;
  const failed = queueItems?.filter((i: any) => i.status?.toLowerCase() === 'failed').length || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>PROCESSING QUEUE</Text>
        <IconButton icon="refresh" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#10b981' }]}>{completed}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#3b82f6' }]}>{processing}</Text>
            <Text style={styles.metricLabel}>Processing</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{queued}</Text>
            <Text style={styles.metricLabel}>Queued</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#ef4444' }]}>{failed}</Text>
            <Text style={styles.metricLabel}>Failed</Text>
          </GlassCard>
        </View>

        <Text style={styles.subtitle}>Real-time Document Batch Status</Text>

        <GlassCard style={styles.card}>
          {isLoading && (!queueItems || queueItems.length === 0) ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : queueItems && queueItems.length > 0 ? (
            queueItems.map((item: any) => {
              const uploader = item.document?.owner_id ? `User #${item.document.owner_id}` : 'System';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.queueItem}
                  onPress={() => router.push(`/analysis/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{item.document?.original_name || item.name || `Document #${item.id}`}</Text>
                    <Text style={styles.docMeta}>
                      ID: {item.id} • {new Date(item.queued_at || item.created_at || Date.now()).toLocaleTimeString()}
                    </Text>
                    <Text style={styles.uploaderText}>Uploaded by: {uploader}</Text>
                    {item.pii_found_count !== undefined && item.pii_found_count !== null && (
                      <Text style={styles.piiCount}>PII Entities Detected: {item.pii_found_count}</Text>
                    )}
                  </View>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '22' }]}
                    textStyle={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: 'bold' }}
                  >
                    {(item.status || 'queued').toUpperCase()}
                  </Chip>
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 14 }}>No jobs in processing queue</Text>
              <CyberButton
                title="Upload New Document"
                onPress={() => router.push('/upload')}
                style={{ marginTop: 16 }}
              />
            </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  scrollContainer: { padding: 20 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 0.23,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
    marginTop: 4,
  },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  card: { padding: 16 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  docName: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  docMeta: { fontSize: 11, color: '#64748b', marginTop: 3 },
  uploaderText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  piiCount: { fontSize: 11, color: '#3b82f6', marginTop: 3, fontWeight: '500' },
  statusChip: { height: 26, justifyContent: 'center' },
});
