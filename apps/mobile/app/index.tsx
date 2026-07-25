import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const router = useRouter();

  useEffect(() => {
    // Check if tokens exist to route correctly
    if (accessToken && user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, accessToken]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
});
