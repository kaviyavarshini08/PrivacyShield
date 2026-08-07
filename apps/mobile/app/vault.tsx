import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useVault } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function VaultScreen() {
  const router = useRouter();
  const { data: vaultItems, isLoading, refetch } = useVault();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = vaultItems?.filter((item: any) =>
    (item.name || item.original_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>ENCRYPTED VAULT</Text>
        <IconButton icon="lock-check" iconColor="#10b981" size={22} onPress={() => refetch()} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Searchbar
          placeholder="Search encrypted vault..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ color: '#ffffff', fontSize: 13 }}
          placeholderTextColor="#64748b"
          iconColor="#3b82f6"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        <GlassCard style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item: any) => (
              <View key={item.id} style={styles.vaultRow}>
                <IconButton icon="file-lock-outline" iconColor="#3b82f6" size={28} />
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={styles.itemTitle}>{item.name || item.original_name}</Text>
                  <Text style={styles.itemSub}>Size: {item.size || '1.2 MB'} • Masked PII: {item.pii || item.pii_count || 0}</Text>
                </View>
                <IconButton
                  icon="eye"
                  iconColor="#10b981"
                  size={20}
                  onPress={() => router.push(`/analysis/${item.id}` as any)}
                />
                <IconButton
                  icon="download"
                  iconColor="#94a3b8"
                  size={20}
                  onPress={() => Alert.alert('Secure Download', `Initiated encrypted export for ${item.name}`)}
                />
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>No encrypted files found in vault</Text>
              <CyberButton
                title="Scan & Add File"
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  searchBar: { backgroundColor: '#0f172a', borderRadius: 12, height: 44 },
  scrollContainer: { padding: 20 },
  card: { padding: 12 },
  vaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
