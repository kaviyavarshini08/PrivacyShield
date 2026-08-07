import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip, Checkbox } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAnalysis, useRedact } from '../../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function DocumentAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const docId = id ? parseInt(id, 10) || id : null;

  const { data: analysis, isLoading, refetch } = useAnalysis(docId);
  const redactMutation = useRedact();
  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);

  const toggleEntity = (entityId: number) => {
    setSelectedEntities(prev =>
      prev.includes(entityId) ? prev.filter(e => e !== entityId) : [...prev, entityId]
    );
  };

  const handleApplyRedaction = () => {
    if (!docId || selectedEntities.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one entity to redact.');
      return;
    }
    redactMutation.mutate(
      { docId: docId as any, entityIds: selectedEntities },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Selected PII entities masked successfully!');
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Redaction Error', err.message || 'Failed to apply redaction.');
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>DOCUMENT ANALYSIS</Text>
        <IconButton icon="refresh" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 40 }} />
        ) : analysis ? (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.docTitle}>{analysis.name || analysis.document?.original_name || `Doc #${id}`}</Text>
              <View style={styles.metaRow}>
                <Chip style={styles.chip} textStyle={{ color: '#3b82f6', fontSize: 11 }}>
                  Risk Score: {analysis.risk_score || 'High'}
                </Chip>
                <Chip style={styles.chip} textStyle={{ color: '#10b981', fontSize: 11 }}>
                  Entities Found: {analysis.entities?.length || 0}
                </Chip>
              </View>
            </GlassCard>

            <Text style={styles.sectionHeader}>Detected PII Entities</Text>
            <GlassCard style={styles.card}>
              {analysis.entities && analysis.entities.length > 0 ? (
                analysis.entities.map((entity: any) => (
                  <View key={entity.id} style={styles.entityRow}>
                    <Checkbox
                      status={selectedEntities.includes(entity.id) ? 'checked' : 'unchecked'}
                      onPress={() => toggleEntity(entity.id)}
                      color="#3b82f6"
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.entityText}>{entity.text || entity.value}</Text>
                      <Text style={styles.entityType}>{entity.type || entity.category} • Confidence: {Math.round((entity.confidence || 0.95) * 100)}%</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 20 }}>No unmasked PII entities remaining.</Text>
              )}
            </GlassCard>

            {analysis.entities && analysis.entities.length > 0 && (
              <CyberButton
                title={`Apply Redaction (${selectedEntities.length} Selected)`}
                onPress={handleApplyRedaction}
                style={{ marginTop: 20 }}
              />
            )}
          </>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={{ color: '#ef4444', textAlign: 'center' }}>Analysis details unavailable or expired.</Text>
          </GlassCard>
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
  card: { padding: 16, marginBottom: 16 },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  metaRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  chip: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10 },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  entityText: { fontSize: 14, color: '#f8fafc', fontWeight: '500' },
  entityType: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
