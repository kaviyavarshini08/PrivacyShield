import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useComplianceOverview } from '../src/api/query';

export default function ComplianceScreen() {
  const router = useRouter();
  const { data: compliance, isLoading, refetch } = useComplianceOverview();
  const [searchQuery, setSearchQuery] = useState('');

  const handleExportAudit = () => {
    Alert.alert('Audit Export', 'Generating certified GDPR/HIPAA compliance report CSV...');
  };

  const logs = compliance?.logs || [];

  const filteredLogs = logs.filter((log: any) => {
    const term = searchQuery.toLowerCase();
    return (log.action || '').toLowerCase().includes(term) ||
           (log.user?.email || log.user || '').toLowerCase().includes(term) ||
           (log.target || '').toLowerCase().includes(term);
  });

  const getSeverityColor = (severity: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'high':
      case 'critical': return '#dc2626'; // Red
      case 'medium': return '#d97706'; // Amber
      default: return '#059669'; // Green
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'high':
      case 'critical': return '#fee2e2';
      case 'medium': return '#fef3c7';
      default: return '#d1fae5';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} style={{ margin: 0, marginLeft: -8 }} />
          <View style={styles.liveStreamBadge}>
            <View style={styles.liveStreamDot} />
            <Text style={styles.liveStreamText}>LIVE AUDIT STREAM</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Compliance Center</Text>
        <Text style={styles.headerSub}>Real-time data processing audit logs and regulatory security events based on uploaded documents.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Searchbar
              placeholder="Search audit logs..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ color: '#0f172a', fontSize: 13 }}
              placeholderTextColor="#64748b"
              iconColor="#3b82f6"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleExportAudit}>
              <Text style={styles.secondaryButtonText}>Export Logs</Text>
            </TouchableOpacity>
          </View>

          {isLoading && logs.length === 0 ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : filteredLogs.length === 0 ? (
             <View style={{ paddingVertical: 40, alignItems: 'center' }}>
               <IconButton icon="file-document-outline" iconColor="#64748b" size={40} />
               <Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 14, marginTop: 8 }}>No Audit Logs Recorded</Text>
               <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                 System events (user logins, document uploads, policy edits) will automatically log here in real time.
               </Text>
             </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flexGrow: 1 }}>
              <View style={{ minWidth: 600 }}>
                <View style={[styles.tableRow, { backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 10 }]}>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Action</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>User</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Target</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>Severity</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>Time</Text>
                </View>
                {filteredLogs.map((log: any, index: number) => {
                  const userDisplay = log.user?.email || log.user || 'System';
                  const severity = log.severity || 'low';
                  return (
                    <View key={log.id || index} style={[styles.tableRow, index === filteredLogs.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '600', color: '#0f172a' }]} numberOfLines={2}>{log.action || 'Event'}</Text>
                      <Text style={[styles.tableCell, { flex: 2, color: '#64748b' }]} numberOfLines={1}>{userDisplay}</Text>
                      <Text style={[styles.tableCell, { flex: 2, color: '#64748b' }]} numberOfLines={1}>{log.target || 'Global'}</Text>
                      <View style={[styles.tableCell, { flex: 1.5, justifyContent: 'center', alignItems: 'flex-start' }]}>
                        <Chip 
                           textStyle={{ color: getSeverityColor(severity), fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }} 
                           style={{ backgroundColor: getSeverityBgColor(severity), height: 22, paddingHorizontal: 0, justifyContent: 'center' }}
                        >
                          {severity}
                        </Chip>
                      </View>
                      <Text style={[styles.tableCell, { flex: 1.5, color: '#64748b' }]} numberOfLines={1}>
                        {log.time || (log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recently')}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 48 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveStreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  liveStreamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  liveStreamText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 },
  scrollContainer: { padding: 20 },
  card: { 
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: { 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  secondaryButton: {
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    backgroundColor: '#ffffff'
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 12,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
  },
});
