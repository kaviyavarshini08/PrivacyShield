import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Linking } from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useVault, getDownloadUrl } from '../../src/api/query';
import { CyberButton } from '@privacyshield/ui';

export default function VaultScreen() {
  const router = useRouter();
  const { data: vaultItems, isLoading, refetch } = useVault();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = vaultItems?.filter((item: any) =>
    (item.name || item.original_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFiles = vaultItems?.length || 0;
  const totalStorageMb = vaultItems ? vaultItems.reduce((acc: number, item: any) => acc + (parseFloat(item.size) || 0), 0).toFixed(1) : 0;
  const totalPiiRedacted = vaultItems ? vaultItems.reduce((acc: number, item: any) => acc + (item.pii || item.pii_count || 0), 0) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} />
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={styles.headerTitle}>Secure Vault</Text>
          <Text style={styles.headerSub}>Encrypted storage for redacted documents</Text>
        </View>
        <IconButton icon="lock-check" iconColor="#10b981" size={22} onPress={() => refetch()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        {/* 2x2 Metrics Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }]}>
              <IconButton icon="lock" iconColor="#2563eb" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{totalFiles}</Text>
              <Text style={styles.metricLabel}>Vault Files</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
              <IconButton icon="file-document" iconColor="#059669" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{totalStorageMb} MB</Text>
              <Text style={styles.metricLabel}>Storage Used</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <IconButton icon="shield-alert" iconColor="#d97706" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>{totalPiiRedacted}</Text>
              <Text style={styles.metricLabel}>PII Redacted</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
              <IconButton icon="lock" iconColor="#059669" size={20} style={{ margin: 0 }} />
            </View>
            <View>
              <Text style={styles.metricValue}>AES-256</Text>
              <Text style={styles.metricLabel}>Encryption</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Searchbar
            placeholder="Search vault files..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ color: '#0f172a', fontSize: 13 }}
            placeholderTextColor="#64748b"
            iconColor="#3b82f6"
          />

          <View style={{ marginTop: 12 }}>
            {isLoading ? (
              <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
            ) : filteredItems && filteredItems.length > 0 ? (
              filteredItems.map((item: any, idx: number) => (
                <View key={item.id} style={[styles.vaultRow, idx === filteredItems.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                  <View style={styles.rowHeader}>
                    <View style={styles.rowTitleContainer}>
                      <IconButton icon="lock" iconColor="#0F766E" size={20} style={{ margin: 0, marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.name || item.original_name}</Text>
                        <Text style={styles.itemSub}>{item.size || '1.2 MB'}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.rowDetails}>
                    <Chip 
                      style={{ backgroundColor: '#f1f5f9', height: 26 }} 
                      textStyle={{ color: '#475569', fontSize: 10, fontWeight: '600' }}
                    >
                      {item.category || 'PDF Document'}
                    </Chip>
                    <Text style={styles.piiText}>PII Redacted: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.pii || item.pii_count || 0}</Text></Text>
                  </View>
                  
                  <View style={styles.rowFooter}>
                    <Text style={styles.footerText}>{item.access || 'Restricted'} • {item.date || 'Today'}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="eye"
                        iconColor="#64748b"
                        size={20}
                        style={{ margin: 0, marginRight: 8 }}
                        onPress={() => router.push(`/analysis/${item.id}` as any)}
                      />
                      <IconButton
                        icon="download"
                        iconColor="#64748b"
                        size={20}
                        style={{ margin: 0 }}
                        onPress={async () => {
                          const url = getDownloadUrl(item.id);
                          const supported = await Linking.canOpenURL(url);
                          if (supported) {
                            await Linking.openURL(url);
                          } else {
                            Alert.alert('Download Error', "Can't open this URL in your browser");
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '500' }}>
                  No items found in secure vault.
                </Text>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#1E3A8A' }]} onPress={() => router.push('/upload')}>
                  <Text style={styles.primaryButtonText}>Upload Document</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    backgroundColor: '#ffffff',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  searchBar: { 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    height: 44, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0' 
  },
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
  vaultRow: {
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
    paddingLeft: 28, // align with text
  },
  piiText: { fontSize: 12, color: '#64748b' },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 28,
  },
  footerText: { fontSize: 11, color: '#64748b' },
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
