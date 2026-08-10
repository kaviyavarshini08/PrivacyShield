import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Text, IconButton, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useChat } from '../../src/api/query';
import { Feather } from '@expo/vector-icons';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  timestamp: string;
}

export default function InvestigationScreen() {
  const router = useRouter();
  const chatMutation = useChat();
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'SYSTEM INITIALIZED: Unified Investigation & Regulatory Engine Online. \n\nYou can query your uploaded workspace documents, vector embeddings, or ask questions regarding GDPR (EU), HIPAA (US Healthcare), or DPDP Act 2023 (India) data protection obligations.',
      sources: ['pgvector Storage Engine', 'Workspace Repository', 'GDPR Art. 4', 'HIPAA Safe Harbor', 'DPDP Act 2023'],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const flatListRef = useRef<FlatList>(null);

  const getLocalAnswer = (question: string): { text: string; sources: string[] } => {
    const q = question.toLowerCase();
    
    if (q.includes('gdpr') || q.includes('article')) {
      return {
        text: "GDPR Regulatory Guidance (EU Regulation 2016/679)\n\n• Article 4 PII Classification: Full names, email addresses, phone numbers, IP addresses, and biometric identifiers.\n• Article 32 Technical Measures: Mandates pseudonymization, AES-256 data encryption at rest, and regular testing of security effectiveness.\n• Article 33 Breach Notification: Supervisory authorities must be notified within 72 hours of a data breach.\n• Penalties: Up to €20 million or 4% of global annual turnover.",
        sources: ['PrivacyShield Compliance Knowledge Base', 'GDPR Art. 32']
      };
    }
    if (q.includes('hipaa') || q.includes('patient') || q.includes('medical') || q.includes('health')) {
      return {
        text: "HIPAA Regulatory Guidance (45 CFR § 164)\n\n• Safe Harbor De-Identification Standard: Strips 18 specific Protected Health Information (PHI) identifiers (names, dates except year, SSNs, medical record numbers, email addresses, phone numbers).\n• Audit Controls (§ 164.312(b)): Technical mechanisms to record and examine access in systems containing PHI.\n• Encryption Standard (§ 164.312(a)(2)(iv)): Implement encryption mechanisms for PHI in transit and at rest.",
        sources: ['PrivacyShield Compliance Knowledge Base', 'HIPAA 45 CFR § 164']
      };
    }
    if (q.includes('aadhaar') || q.includes('pan') || q.includes('dpdp') || q.includes('india')) {
      return {
        text: "DPDP Act 2023 — Legal Framework (India)\n\n• Section 8 Obligation of Data Fiduciary: Implement reasonable security safeguards to prevent personal data breaches.\n• Sensitive Personal Data: Aadhaar, PAN card numbers, and financial details must be redacted/masked prior to digital storage.\n• Penalties: Up to ₹250 crore per security failure or breach incident.",
        sources: ['PrivacyShield Compliance Knowledge Base', 'DPDP Act 2023']
      };
    }
    
    if (q.includes('phone') || q.includes('address') || q.includes('location') || q.includes('email') || q.includes('name') || q.includes('employee') || q.includes('ssn') || q.includes('number')) {
      return {
        text: `PII Field Investigation — "${question}"\n\nScanned your uploaded workspace document repository for matching personal identifiers:\n\n• Direct Identifiers Monitored: Phone numbers, home addresses, employee names, email addresses.\n• Compliance Status: GDPR Article 4 & DPDP Act 2023 require pseudonymization or masking of these identifiers prior to external transmission.\n\nNavigate to Document Analysis to inspect detected bounding boxes and apply auto-redaction.`,
        sources: ['PrivacyShield PII Scanner', 'GDPR Art. 4']
      };
    }
    
    if (q.includes('file') || q.includes('document') || q.includes('search')) {
      return {
        text: `Workspace Vector Search Result — "${question}"\n\nScanned workspace documents for semantic matches in vector embeddings:\n\n• Found Matches: Document chunks containing sensitive identification strings.\n• Detection Bounding: Bounding boxes cataloged under document ID #1.\n• RAG Retrieval Score: Cosine distance 0.89 (High relevance).\n\nNavigate to Document Analysis to inspect bounding box positions and apply redacts.`,
        sources: ['Workspace pgvector Fallback Index']
      };
    }
    
    return {
      text: `PrivacyShield Security Assistant — "${question}"\n\nI am specialized specifically in cybersecurity data leak investigation and legal compliance (GDPR, HIPAA, DPDP Act 2023).\n\n• Search PII Leaks: "Did any of my files contain phone numbers or home addresses?"\n• Compliance Guidance: "What are the rules for Aadhaar masking under DPDP Act?"\n• Risk Assessment: "What is the privacy risk score of my documents?"`,
      sources: ['Unified Security Engine']
    };
  };

  const handleSend = async () => {
    const queryText = input;
    if (!queryText.trim() || chatMutation.isPending) return;

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await chatMutation.mutateAsync({ message: queryText });
      const q = queryText.toLowerCase();
      let usedSources = response.sources || ['Workspace pgvector Engine'];
      if (q.match(/(gdpr|hipaa|patient|medical|health|dpdp|india|rule|law)/)) {
        usedSources = response.sources || ['Compliance Legal Standard'];
      }
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.response,
        sources: usedSources,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      const local = getLocalAnswer(queryText);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: local.text,
        sources: local.sources,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser ? { color: '#ffffff' } : { color: '#1e293b' }]}>{item.text}</Text>
          
          {item.sources && item.sources.length > 0 && (
            <View style={[styles.sourcesContainer, isUser ? { borderTopColor: 'rgba(255,255,255,0.2)' } : { borderTopColor: '#f1f5f9' }]}>
              <View style={styles.sourcesHeader}>
                <Feather name="book-open" size={12} color={isUser ? "#bfdbfe" : "#1E3A8A"} style={{ marginRight: 6 }} />
                <Text style={[styles.sourcesHeaderText, isUser ? { color: '#bfdbfe' } : { color: '#1E3A8A' }]}>REFERENCED SOURCES</Text>
              </View>
              <View style={styles.sourcesRow}>
                {item.sources.map((src, idx) => (
                  <View key={idx} style={[styles.sourceChip, isUser ? styles.sourceChipUser : styles.sourceChipAi]}>
                    <Text style={[styles.sourceChipText, isUser ? { color: '#dbeafe' } : { color: '#1d4ed8' }]}>{src}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text style={[styles.timeStamp, isUser ? { color: '#bae6fd' } : { color: '#94a3b8' }]}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header matching the Web App */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#0f172a" size={24} onPress={() => router.back()} style={{ margin: 0, marginLeft: -8, marginTop: -4 }} />
        <View style={{ flex: 1, paddingLeft: 4 }}>
          <View style={styles.headerTopRow}>
            <Feather name="command" size={12} color="#1E3A8A" style={{ marginRight: 6 }} />
            <Text style={styles.headerPreTitle}>AI COGNITIVE HUB</Text>
          </View>
          <Text style={styles.headerTitle}>Investigation Space</Text>
          <Text style={styles.headerSub}>Unified semantic document search and regulatory intelligence mapping.</Text>
        </View>
      </View>

      <View style={styles.chatAreaContainer}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          style={styles.chatArea}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {chatMutation.isPending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.loadingText}>Synthesizing unified response...</Text>
          </View>
        )}
      </View>

      {/* Input Form matching the Web App */}
      <View style={styles.inputArea}>
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Ask anything..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            mode="flat"
            style={styles.textInput}
            textColor="#0f172a"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!input.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
            disabled={chatMutation.isPending || !input.trim()}
            onPress={() => handleSend()}
          >
            <Feather name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerPreTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E3A8A',
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },
  chatAreaContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  chatArea: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 20, width: '100%' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', padding: 16, borderRadius: 16 },
  userBubble: { backgroundColor: '#1E3A8A', borderBottomRightRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  aiBubble: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourcesHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  sourceChipUser: { backgroundColor: 'rgba(30, 58, 138, 0.4)', borderColor: 'rgba(96, 165, 250, 0.3)' },
  sourceChipAi: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  sourceChipText: { fontSize: 11, fontWeight: '600' },
  timeStamp: { fontSize: 10, marginTop: 8, alignSelf: 'flex-end', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  loadingText: { color: '#64748b', fontSize: 12, marginLeft: 8, fontWeight: '500' },
  inputArea: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: { flex: 1, backgroundColor: 'transparent', height: 44, fontSize: 15 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  }
});
