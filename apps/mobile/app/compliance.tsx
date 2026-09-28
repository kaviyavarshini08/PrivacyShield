import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Share } from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useComplianceOverview } from '../src/api/query';
import { Feather } from '@expo/vector-icons';

export default function ComplianceScreen() {
  const router = useRouter();
  const { data: compliance, isLoading, refetch } = useComplianceOverview();
  const [searchQuery, setSearchQuery] = useState('');

  const logs = compliance?.logs || [];

  const filteredLogs = logs.filter((log: any) => {
    if (!log) return false;
    const actionStr = typeof log.action === 'string' ? log.action : String(log.action || '');
    const userStr = typeof log.user === 'object' && log.user ? (log.user.email || '') : String(log.user || '');
    const targetStr = typeof log.target === 'string' ? log.target : String(log.target || '');
    const term = (searchQuery || '').toLowerCase();
    return (
      actionStr.toLowerCase().includes(term) ||
      userStr.toLowerCase().includes(term) ||
      targetStr.toLowerCase().includes(term)
    );
  });

  const handleExportAudit = async () => {
    if (filteredLogs.length === 0) {
      Alert.alert('Export Logs', 'No audit logs available to export.');
      return;
    }

    const headers = ["ID", "Action", "User", "Target", "Severity", "Time"];
    const csvRows = filteredLogs.map((l: any) => [
      l.id || '',
      `"${l.action || ''}"`,
      `"${typeof l.user === 'object' && l.user ? l.user.email : (l.user || 'System')}"`,
      `"${l.target || 'Global'}"`,
      `"${(l.severity || 'low').toUpperCase()}"`,
      `"${l.time || 'Recently'}"`
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    try {
      await Share.share({
        title: `PrivacyShield Audit Logs - ${new Date().toISOString().slice(0, 10)}.csv`,
        message: csvContent,
      });
    } catch (err) {
      Alert.alert('Export Logs', 'Audit logs prepared successfully:\n\n' + csvContent.slice(0, 300) + '...');
    }
  };

  const getSeverityBadgeStyle = (severity: string) => {
    const sev = (severity || 'low').toLowerCase();
    if (sev === 'high' || sev === 'critical') {
      return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
    } else if (sev === 'medium') {
      return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
    } else {
      return { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar Header */}
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
          {/* Card Top Controls */}
          <View style={styles.cardHeader}>
            <Searchbar
              placeholder="Search audit logs..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ color: '#0f172a', fontSize: 13 }}
              placeholderTextColor="#64748b"
              iconColor="#64748b"
            />
            <TouchableOpacity style={styles.exportButton} onPress={handleExportAudit} activeOpacity={0.7}>
              <Feather name="download" size={14} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.exportButtonText}>Export Logs</Text>
            </TouchableOpacity>
          </View>

          {/* Table Data / Empty State */}
          {isLoading && logs.length === 0 ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 40 }} />
          ) : filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={36} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Audit Logs Recorded</Text>
              <Text style={styles.emptySub}>
                System events (user logins, document uploads, policy edits) will automatically log here in real time.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: 620 }}>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2.2 }]}>Action</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2.2 }]}>User</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.8 }]}>Target</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>Severity</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>Time</Text>
                </View>

                {/* Table Rows */}
                {filteredLogs.map((log: any, index: number) => {
                  const userDisplay = typeof log.user === 'object' && log.user ? log.user.email : String(log.user || 'System');
                  const severityDisplay = String(log.severity || 'low').toLowerCase();
                  const badgeStyle = getSeverityBadgeStyle(severityDisplay);

                  return (
                    <View key={log.id || index} style={[styles.tableRow, index === filteredLogs.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={[styles.tableCell, { flex: 2.2, fontWeight: '600', color: '#0f172a' }]} numberOfLines={2}>
                        {log.action || 'Event'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 2.2, color: '#475569' }]} numberOfLines={1}>
                        {userDisplay}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.8, color: '#475569' }]} numberOfLines={1}>
                        {log.target || 'Global'}
                      </Text>
                      <View style={[styles.tableCell, { flex: 1.5, justifyContent: 'center' }]}>
                        <View style={[styles.badge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
                          <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                            {severityDisplay.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.tableCell, { flex: 1.5, color: '#64748b' }]} numberOfLines={1}>
                        {log.time || 'Recently'}
                      </Text>
                    </View>
                  );
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'column',
    gap: 12,
  },
  searchBar: { 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 0,
  },
  exportButton: {
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  exportButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyTitle: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 10
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 12,
    paddingHorizontal: 14,
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
