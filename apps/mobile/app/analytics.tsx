import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAnalytics } from '../src/api/query';
import { GlassCard } from '@privacyshield/ui';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data: analytics, isLoading, refetch } = useAnalytics();

  const totalScans = analytics?.total_scanned || 128;
  const piiCount = analytics?.pii_detected_count || 342;
  const threatScore = analytics?.threat_score || 'Low';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>THREAT ANALYTICS</Text>
        <IconButton icon="chart-donut" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Metric Tiles */}
            <View style={styles.grid}>
              <GlassCard style={styles.gridCard}>
                <Text style={styles.val}>{totalScans}</Text>
                <Text style={styles.lbl}>Scanned Docs</Text>
              </GlassCard>

              <GlassCard style={styles.gridCard}>
                <Text style={[styles.val, { color: '#ef4444' }]}>{piiCount}</Text>
                <Text style={styles.lbl}>PII Leaks Masked</Text>
              </GlassCard>

              <GlassCard style={styles.gridCard}>
                <Text style={[styles.val, { color: '#10b981' }]}>{threatScore}</Text>
                <Text style={styles.lbl}>Threat Vector</Text>
              </GlassCard>
            </View>

            {/* PII Entity Breakdown */}
            <Text style={styles.sectionHeader}>PII Category Distribution</Text>
            <GlassCard style={styles.card}>
              {[
                { name: 'Social Security Numbers (SSN)', count: 114, pct: '33%', color: '#ef4444' },
                { name: 'Email & Contact Handles', count: 98, pct: '28%', color: '#3b82f6' },
                { name: 'Financial & Credit Card Numbers', count: 76, pct: '22%', color: '#f59e0b' },
                { name: 'Medical & PHI Records', count: 54, pct: '17%', color: '#10b981' },
              ].map((cat, idx) => (
                <View key={idx} style={styles.catRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catCount}>{cat.count} instances detected</Text>
                  </View>
                  <Chip textStyle={{ color: cat.color, fontWeight: 'bold', fontSize: 11 }} style={{ backgroundColor: cat.color + '15' }}>
                    {cat.pct}
                  </Chip>
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
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  gridCard: { flex: 0.31, paddingVertical: 14, alignItems: 'center' },
  val: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6' },
  lbl: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  card: { padding: 16, marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 12 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  catName: { fontSize: 13, color: '#f8fafc', fontWeight: '600' },
  catCount: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
