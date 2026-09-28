import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAnalytics } from '../src/api/query';
import { Feather } from '@expo/vector-icons';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data: analytics, isLoading, refetch } = useAnalytics();
  const [selectedDocId, setSelectedDocId] = useState<string>('all');

  const perDocData: any[] = analytics?.per_document_data || [];
  const isAll = selectedDocId === 'all';
  const selectedDoc = perDocData.find((d: any) => String(d.id) === selectedDocId);

  const activeEntityCounts: Record<string, number> = isAll
    ? (analytics?.entity_counts || {})
    : (selectedDoc?.entity_counts || {});

  const totalScans = isAll ? (analytics?.total_documents || 0) : 1;
  const piiCount = isAll ? (analytics?.total_entities_found || 0) : (selectedDoc?.pii_count || 0);
  const redactedCount = isAll ? (analytics?.redacted_count || 0) : (selectedDoc?.status === 'Redacted' ? 1 : 0);
  const storageMb = isAll 
    ? (analytics?.total_storage_mb || 0)
    : (selectedDoc ? (selectedDoc.size_kb / 1024).toFixed(2) : 0);
  const avgConfidence = analytics?.avg_confidence ? `${analytics.avg_confidence}%` : '98.5%';

  const getEntityCount = (keys: string[]) => {
    let count = 0;
    Object.entries(activeEntityCounts).forEach(([k, v]) => {
      const upperK = k.toUpperCase();
      if (keys.some(key => upperK.includes(key.toUpperCase()))) {
        count += Number(v) || 0;
      }
    });
    return count;
  };

  const piiBreakdownData = [
    { name: 'Aadhaar (National ID)', count: getEntityCount(['AADHAAR', 'IN_AADHAAR']), color: '#06b6d4' },
    { name: 'PAN Card (Tax ID)', count: getEntityCount(['PAN', 'IN_PAN']), color: '#14b8a6' },
    { name: 'Passport', count: getEntityCount(['PASSPORT']), color: '#3b82f6' },
    { name: 'Voter ID', count: getEntityCount(['VOTER_ID', 'IN_VOTER_ID']), color: '#6366f1' },
    { name: 'Bank Account', count: getEntityCount(['BANK_ACCOUNT', 'IN_BANK_ACCOUNT']), color: '#8b5cf6' },
    { name: 'UPI ID', count: getEntityCount(['UPI', 'UPI_ID']), color: '#a855f7' },
    { name: 'ABHA ID', count: getEntityCount(['ABHA_ID', 'IN_ABHA_ID']), color: '#ec4899' },
    { name: 'Biometric Data', count: getEntityCount(['BIOMETRIC', 'BIOMETRIC_DATA']), color: '#f43f5e' },
    { name: 'Credit Card', count: getEntityCount(['CREDIT', 'CREDIT_CARD']), color: '#eab308' },
    { name: 'Phone Number', count: getEntityCount(['PHONE', 'MOBILE', 'PHONE_NUMBER']), color: '#f59e0b' },
    { name: 'Email Address', count: getEntityCount(['EMAIL', 'EMAIL_ADDRESS']), color: '#10b981' },
  ];

  const totalActivePii = piiBreakdownData.reduce((acc, curr) => acc + curr.count, 0);

  const activeCategories = piiBreakdownData
    .filter(cat => cat.count > 0)
    .map(cat => ({
      ...cat,
      percentageNum: totalActivePii > 0 ? (cat.count / totalActivePii) * 100 : 0,
      pct: totalActivePii > 0 ? `${Math.round((cat.count / totalActivePii) * 100)}%` : '0%'
    }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
        <Text style={styles.headerTitle}>Analytics Hub</Text>
        <IconButton icon="reload" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Filter by document if per-doc data exists */}
            {perDocData.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Scope Analytics:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.filterChip, isAll && styles.filterChipActive]}
                    onPress={() => setSelectedDocId('all')}
                  >
                    <Text style={[styles.filterChipText, isAll && styles.filterChipTextActive]}>All Documents</Text>
                  </TouchableOpacity>
                  {perDocData.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.filterChip, selectedDocId === String(doc.id) && styles.filterChipActive]}
                      onPress={() => setSelectedDocId(String(doc.id))}
                    >
                      <Text style={[styles.filterChipText, selectedDocId === String(doc.id) && styles.filterChipTextActive]}>
                        {doc.filename?.length > 15 ? doc.filename.slice(0, 15) + '...' : doc.filename}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Metric Tiles (6 Grid Cards for 100% web parity) */}
            <View style={styles.grid}>
              <View style={styles.gridCard}>
                <Text style={styles.val}>{totalScans}</Text>
                <Text style={styles.lbl}>Scanned Docs</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={[styles.val, { color: '#ef4444' }]}>{piiCount}</Text>
                <Text style={styles.lbl}>PII Detected</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={[styles.val, { color: '#10b981' }]}>{redactedCount}</Text>
                <Text style={styles.lbl}>Redacted Docs</Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridCard}>
                <Text style={[styles.val, { color: '#8b5cf6' }]}>{storageMb} MB</Text>
                <Text style={styles.lbl}>Total Storage</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={[styles.val, { color: '#06b6d4' }]}>{avgConfidence}</Text>
                <Text style={styles.lbl}>Avg Confidence</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={[styles.val, { color: '#f59e0b' }]}>
                  {activeCategories.length > 0 ? activeCategories[0].name.split(' ')[0] : 'None'}
                </Text>
                <Text style={styles.lbl}>Top Entity</Text>
              </View>
            </View>

            {/* PII Entity Breakdown with Visual Graph Bars */}
            <Text style={styles.sectionHeader}>PII Category Distribution Graph</Text>
            <View style={styles.card}>
              {activeCategories.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Feather name="bar-chart-2" size={32} color="#cbd5e1" />
                  <Text style={{ color: '#64748b', marginTop: 8 }}>No PII detected in selected scope.</Text>
                </View>
              ) : (
                activeCategories.map((cat, idx) => (
                  <View key={idx} style={[styles.catRow, idx === activeCategories.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={[styles.catCount, { color: cat.color, fontWeight: 'bold' }]}>
                          {cat.count} ({cat.pct})
                        </Text>
                      </View>
                      {/* Visual Graph Bar */}
                      <View style={styles.graphBarBg}>
                        <View style={[styles.graphBarFill, { width: `${cat.percentageNum}%`, backgroundColor: cat.color }]} />
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.5 },
  scrollContainer: { padding: 20 },
  filterSection: { marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3b82f6' },
  filterChipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  filterChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  gridCard: { 
    flex: 0.31, 
    paddingVertical: 14, 
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  val: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
  lbl: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  card: { 
    padding: 16, 
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 12 },
  catRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  catName: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  catCount: { fontSize: 12 },
  graphBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  graphBarFill: { height: '100%', borderRadius: 4 },
});
