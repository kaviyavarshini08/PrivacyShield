import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, ActivityIndicator, IconButton, Checkbox } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAnalysis, useRedact, getDownloadUrl } from '../../src/api/query';
import { Feather } from '@expo/vector-icons';

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
          setSelectedEntities([]);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Redaction Error', err.message || 'Failed to apply redaction.');
        }
      }
    );
  };

  const handleDownload = async () => {
    if (!docId) return;
    const url = getDownloadUrl(docId);
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Download Error', "Can't open this URL in your browser");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
        <Text style={styles.headerTitle}>Document Analysis</Text>
        <IconButton icon="refresh" iconColor="#3b82f6" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 40 }} />
        ) : analysis ? (
          <>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.docTitle}>{analysis.document?.original_name || analysis.name || `Doc #${id}`}</Text>
                  <Text style={styles.docStatus}>Status: {(analysis.status || 'processed').toUpperCase()}</Text>
                </View>
                {analysis.redacted_storage_path && (
                  <IconButton 
                    icon="download" 
                    mode="contained"
                    containerColor="#e0f2fe"
                    iconColor="#0284c7"
                    size={22}
                    onPress={handleDownload}
                    style={{ margin: 0 }}
                  />
                )}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                   <Feather name="file-text" size={20} color="#0284c7" />
                </View>
                <Text style={styles.metricValue}>{analysis.entities?.length || 0}</Text>
                <Text style={styles.metricLabel}>Entities Detected</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                   <Feather name="shield" size={20} color="#059669" />
                </View>
                <Text style={styles.metricValue}>
                  {analysis.entities?.filter((e: any) => e.is_redacted).length || 0}
                </Text>
                <Text style={styles.metricLabel}>Entities Redacted</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
                   <Feather name="check-circle" size={20} color="#4f46e5" />
                </View>
                <Text style={styles.metricValue}>
                  {analysis.entities?.length > 0 
                    ? (analysis.entities.reduce((acc: number, e: any) => acc + (e.confidence || 0.95), 0) / analysis.entities.length * 100).toFixed(1)
                    : 100}%
                </Text>
                <Text style={styles.metricLabel}>Avg Confidence</Text>
              </View>
            </ScrollView>

            <Text style={styles.sectionHeader}>Detected PII Entities</Text>
            <View style={styles.card}>
              {analysis.entities && analysis.entities.length > 0 ? (
                analysis.entities.map((entity: any, idx: number) => (
                  <View key={entity.id} style={[styles.entityRow, idx === analysis.entities.length - 1 && { borderBottomWidth: 0 }]}>
                    <Checkbox
                      status={entity.is_redacted ? 'checked' : selectedEntities.includes(entity.id) ? 'checked' : 'unchecked'}
                      onPress={() => { if (!entity.is_redacted) toggleEntity(entity.id) }}
                      color={entity.is_redacted ? '#10b981' : '#3b82f6'}
                      disabled={entity.is_redacted}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.entityText, entity.is_redacted && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
                        {entity.text || entity.value}
                      </Text>
                      <Text style={styles.entityType}>
                        {entity.type || entity.category} • Confidence: {Math.round((entity.confidence || 0.95) * 100)}%
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 20 }}>No unmasked PII entities remaining.</Text>
              )}
            </View>

            {analysis.entities && analysis.entities.length > 0 && selectedEntities.length > 0 && (
              <IconButton 
                icon="shield-lock" 
                mode="contained"
                containerColor="#3b82f6"
                iconColor="#ffffff"
                size={24}
                style={styles.actionButton}
                onPress={handleApplyRedaction}
              />
            )}
            {analysis.entities && analysis.entities.length > 0 && selectedEntities.length > 0 && (
              <Text style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: -8 }}>
                Apply Redaction ({selectedEntities.length} Selected)
              </Text>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={{ color: '#ef4444', textAlign: 'center' }}>Analysis details unavailable or expired.</Text>
          </View>
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
  card: { 
    padding: 16, 
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  docStatus: { fontSize: 12, color: '#64748b', marginTop: 4 },
  metricsContainer: { paddingBottom: 16, gap: 12 },
  metricCard: { 
    width: 135, 
    padding: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  metricIconWrap: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  metricLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 10 },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  entityText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  entityType: { fontSize: 11, color: '#64748b', marginTop: 2 },
  actionButton: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
    marginTop: 12
  }
});
