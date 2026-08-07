import React, { useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Text, IconButton, RadioButton, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

export default function Upload() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Camera View Simulation
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSubject, setCameraSubject] = useState<'aadhaar' | 'pan' | 'medical'>('aadhaar');

  const triggerFileSelection = async () => {
    setStatusMsg('');
    setCameraActive(false);
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

const safeBtoa = (str: string) => {
  try {
    if (typeof btoa === 'function') return btoa(str);
  } catch (e) {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
       str.charAt(i | 0) || (map = '=', i % 1);
       output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    block = block << 8 | charCode;
  }
  return output;
};

  const handleCameraCapture = () => {
    // Generate simulated PII file blobs based on chosen subject
    let fileName = '';
    let fileContent = '';
    
    if (cameraSubject === 'aadhaar') {
      fileName = 'camera_snap_aadhaar.txt';
      fileContent = 'CONFIDENTIAL DOCUMENT. Aadhaar Card Number: 5678 1234 9012. Name: Rajesh Kumar. Address: Bangalore, India.';
    } else if (cameraSubject === 'pan') {
      fileName = 'camera_snap_pan.txt';
      fileContent = 'GOVERNMENT OF INDIA. INCOME TAX DEPARTMENT. PAN Card: DFJKP9876C. Holder: Priya Sharma.';
    } else {
      fileName = 'camera_snap_medical.txt';
      fileContent = 'PATIENT MEDICAL SHEET. Name: John Miller. Phone: +91 9448855220. Diagnostics: Type-II Diabetes. Under treatment.';
    }

    // Build mock file for upload
    const mockFile = {
      name: fileName,
      mimeType: 'text/plain',
      size: fileContent.length,
      // For web, create a Blob from string content
      raw: Platform.OS === 'web' ? new Blob([fileContent], { type: 'text/plain' }) : null,
      uri: Platform.OS !== 'web' ? 'data:text/plain;base64,' + safeBtoa(fileContent) : null,
      content: fileContent
    };

    setSelectedFile(mockFile);
    setCameraActive(false);
    setStatusMsg(`Simulated camera capture loaded: ${fileName}`);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setStatusMsg('Encrypting & uploading document...');
    
    const formData = new FormData();
    
    // Check if mock camera text upload or real file
    if (Platform.OS === 'web') {
      formData.append('file', selectedFile.raw, selectedFile.name);
    } else {
      if (selectedFile.uri && selectedFile.uri.startsWith('data:')) {
        // Native simulated base64 text upload file creation helper
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: 'text/plain'
        } as any);
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream'
        } as any);
      }
    }

    try {
      await api.post('/documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStatusMsg('Document successfully uploaded & queued!');
      setTimeout(() => {
        router.replace('/dashboard');
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
        <IconButton
          icon="arrow-left"
          iconColor="#ffffff"
          size={24}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>SCAN CENTER</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cameraActive ? (
          <GlassCard style={styles.cameraViewfinder}>
            <Text style={styles.cameraTitle}>Simulated OCR Viewfinder</Text>
            <Text style={styles.cameraSub}>Select PII profile card to snap:</Text>
            
            <RadioButton.Group onValueChange={value => setCameraSubject(value as any)} value={cameraSubject}>
              <View style={styles.radioRow}>
                <RadioButton.Android value="aadhaar" color="#3b82f6" uncheckedColor="#475569" />
                <Text style={styles.radioLabel}>Aadhaar Card (National ID)</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Android value="pan" color="#3b82f6" uncheckedColor="#475569" />
                <Text style={styles.radioLabel}>PAN Card (Income Tax ID)</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Android value="medical" color="#3b82f6" uncheckedColor="#475569" />
                <Text style={styles.radioLabel}>Patient Medical File</Text>
              </View>
            </RadioButton.Group>

            {/* Simulated Focus bracket */}
            <View style={styles.focusFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <Text style={styles.focusText}>ALIGN ID CARD INSIDE FRAME</Text>
            </View>

            <View style={styles.cameraButtons}>
              <CyberButton
                title="Capture Snap"
                onPress={handleCameraCapture}
                style={styles.shutterBtn}
              />
              <CyberButton
                title="Cancel"
                onPress={() => setCameraActive(false)}
                variant="secondary"
                style={styles.shutterBtn}
              />
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={styles.title}>Secure Sandbox Scanner</Text>
            <Text style={styles.description}>
              Upload PDF, DOCX, TXT, CSV or trigger the OCR camera to inspect structural layers for PII breaches.
            </Text>

            <View style={styles.selectorArea}>
              {selectedFile ? (
                <View style={styles.fileBox}>
                  <IconButton icon="file-document" iconColor="#3b82f6" size={32} />
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    Size: {selectedFile.size} Bytes
                  </Text>
                </View>
              ) : (
                <IconButton
                  icon="cloud-upload"
                  iconColor="rgba(255, 255, 255, 0.4)"
                  size={64}
                  onPress={triggerFileSelection}
                />
              )}
            </View>

            <View style={styles.actionsRow}>
              <CyberButton
                title="Browse Files"
                onPress={triggerFileSelection}
                variant="secondary"
                disabled={uploading}
                style={styles.actionBtn}
              />
              <CyberButton
                title="Use OCR Camera"
                onPress={() => setCameraActive(true)}
                variant="secondary"
                disabled={uploading}
                style={StyleSheet.flatten([styles.actionBtn, { marginLeft: 10 }])}
              />
            </View>

            {selectedFile && (
              <CyberButton
                title="Secure Scan & Analyze"
                onPress={handleUpload}
                loading={uploading}
                style={styles.uploadBtn}
              />
            )}

            {statusMsg ? <Text style={styles.statusMsg}>{statusMsg}</Text> : null}
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Slate 950
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'stretch',
    padding: 24,
  },
  cameraViewfinder: {
    alignSelf: 'stretch',
    padding: 24,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  cameraSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    color: '#ffffff',
    fontSize: 13,
  },
  focusFrame: {
    height: 140,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    marginVertical: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  focusText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#3b82f6',
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shutterBtn: {
    flex: 0.48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  selectorArea: {
    height: 140,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fileBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fileName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  fileSize: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
  },
  uploadBtn: {
    marginTop: 4,
  },
  statusMsg: {
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    fontWeight: '500',
  },
});
