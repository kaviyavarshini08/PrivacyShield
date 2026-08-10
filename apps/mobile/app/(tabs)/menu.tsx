import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MenuScreen() {
  const router = useRouter();

  const menuItems = [
    { title: 'Upload Document', icon: 'upload-cloud', route: '/upload', color: '#10b981' },
    { title: 'Processing Queue', icon: 'server', route: '/queue', color: '#3b82f6' },
    { title: 'Compliance Center', icon: 'shield', route: '/compliance', color: '#8b5cf6' },
    { title: 'Analytics Hub', icon: 'pie-chart', route: '/analytics', color: '#ec4899' },
    { title: 'System Settings', icon: 'settings', route: '/settings', color: '#64748b' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.menuItem} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
              <Feather name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.5 },
  scrollContainer: { padding: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a'
  }
});
