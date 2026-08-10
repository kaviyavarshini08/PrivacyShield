import React, { useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../src/api/query';
import { Feather } from '@expo/vector-icons';

export default function Upload() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const triggerFileSelection = async () => {
    setStatusMsg('');
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.csv';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            setSelectedFile({
              name: file.name,
              mimeType: file.type,
              size: file.size,
              raw: file
            });
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/png',
            'image/jpeg',
            'text/csv'
          ],
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelectedFile(result.assets[0]);
        }
      }
    } catch (err) {
      console.error('File pick failed', err);
      setStatusMsg('Failed to select file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setStatusMsg('Encrypting & uploading document...');

    const formData = new FormData();

    if (Platform.OS === 'web') {
      formData.append('file', selectedFile.raw, selectedFile.name);
    } else {
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream'
      } as any);
    }

    try {
      await api.post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatusMsg('Document successfully uploaded & queued!');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
        <Text style={styles.headerTitle}>Upload</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.pageTitle}>Upload Documents</Text>
          <Text style={styles.pageSubtitle}>Upload documents for automatic PII detection and redaction</Text>
        </View>

        {/* Drop Zone */}
        <TouchableOpacity
          style={styles.dropzone}
          onPress={triggerFileSelection}
          activeOpacity={0.7}
        >
          {selectedFile ? (
            <View style={styles.fileBox}>
              <View style={styles.iconCircle}>
                <Feather name="file-text" size={32} color="#1E3A8A" />
              </View>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                Size: {Math.round((selectedFile.size || 0) / 1024)} KB
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <View style={styles.iconCircle}>
                {uploading ? (
                  <ActivityIndicator size="large" color="#1E3A8A" />
                ) : (
                  <Feather name="upload-cloud" size={32} color="#64748b" />
                )}
              </View>
              <Text style={styles.dropzoneTitle}>Tap to browse files</Text>
              <Text style={styles.dropzoneSubtitle}>Supported: PDF, DOCX, TXT, PNG, JPG, CSV</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        {!selectedFile ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={triggerFileSelection}
            disabled={uploading}
          >
            <Text style={styles.primaryButtonText}>Select Files</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => setSelectedFile(null)}
              disabled={uploading}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 2, opacity: uploading ? 0.7 : 1 }]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Upload Document</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {statusMsg ? <Text style={styles.statusMsg}>{statusMsg}</Text> : null}

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: '#eff6ff' }]}>
              <Feather name="hard-drive" size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.infoCardTitle}>Max file size</Text>
              <Text style={styles.infoCardValue}>50 MB</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Feather name="check-circle" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.infoCardTitle}>Batch upload</Text>
              <Text style={styles.infoCardValue}>Up to 100 files</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconCircle, { backgroundColor: '#fffbeb' }]}>
              <Feather name="clock" size={18} color="#d97706" />
            </View>
            <View>
              <Text style={styles.infoCardTitle}>Processing time</Text>
              <Text style={styles.infoCardValue}>~30 sec/file</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dropzoneSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  fileBox: {
    alignItems: 'center',
  },
  fileName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  fileSize: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  statusMsg: {
    color: '#10b981',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  infoCardsContainer: {
    marginTop: 8,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
});
