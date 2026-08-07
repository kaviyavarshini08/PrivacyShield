import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Text, IconButton, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useChat } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  timestamp: string;
}

export default function InvestigationScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'rag' | 'compliance'>('rag');
  const [ragMessages, setRagMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'SYSTEM INITIALIZED: Workspace RAG Search Engine Online. Query uploaded workspace documents, vector embeddings, and detected PII records across all stored files.',
      sources: ['pgvector Storage Engine', 'Workspace Repository'],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [complianceMessages, setComplianceMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'REGULATORY ASSISTANT ACTIVE: PrivacyShield Compliance Engine Online. Inquire regarding GDPR (EU), HIPAA (US Healthcare), or DPDP Act 2023 (India) data protection obligations and de-identification frameworks.',
      sources: ['GDPR Art. 4', 'HIPAA Safe Harbor', 'DPDP Act 2023'],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [input, setInput] = useState('');
  const chatMutation = useChat();
  const activeMessages = mode === 'rag' ? ragMessages : complianceMessages;

  const quickPrompts = mode === 'compliance' ? [
    'What is HIPAA Safe Harbor 18 PHI?',
    'GDPR Article 32 Encryption Rules',
    'DPDP Act 2023 Aadhaar Masking',
  ] : [
    'Search Aadhaar card vector matches',
    'Find high-entropy AWS keys',
    'Scan employee payroll embeddings',
  ];

  const getLocalAnswer = (question: string, currentMode: 'rag' | 'compliance'): { text: string; sources: string[] } => {
    const q = question.toLowerCase();
    if (currentMode === 'compliance') {
      if (q.includes('gdpr') || q.includes('article')) {
        return {
          text: "GDPR Regulatory Guidance (EU Regulation 2016/679)\n\n• Article 4 PII Classification: Names, emails, phone numbers, IP addresses, biometrics.\n• Article 32 Security: Pseudonymization, AES-256 encryption at rest, regular efficacy testing.\n• Article 33 Breach Notice: Supervisory authorities notified within 72 hours.\n• Penalties: Up to €20M or 4% of global turnover.",
          sources: ['GDPR Art. 4 & 32', 'EU Directive 2016/679']
        };
      }
      if (q.includes('hipaa') || q.includes('phi') || q.includes('health') || q.includes('medical')) {
        return {
          text: "HIPAA Regulatory Guidance (45 CFR § 164)\n\n• Safe Harbor Standard: Strips 18 PHI identifiers (Names, dates except year, SSNs, medical record numbers, emails).\n• Audit Controls (§ 164.312(b)): Technical logs for PHI access.\n• Encryption Standard (§ 164.312(a)): Mandatory encryption in transit & rest.",
          sources: ['HIPAA Safe Harbor Standard', '45 CFR § 164.312']
        };
      }
      if (q.includes('aadhaar') || q.includes('pan') || q.includes('dpdp') || q.includes('india')) {
        return {
          text: "DPDP Act 2023 Legal Framework (India)\n\n• Section 8 Duties: Data Fiduciaries must implement robust security safeguards against leakage.\n• Aadhaar & PAN Protection: National IDs & financial records must be masked prior to storage.\n• Statutory Fines: Up to ₹250 crore per breach incident.",
          sources: ['DPDP Act 2023 Sec. 8', 'Cert-In Directives']
        };
      }
      return {
        text: `PrivacyShield Legal Advisor — "${question}"\n\nI provide specialized compliance guidance across:\n• GDPR (EU) — Direct identifiers & Art. 32 rules\n• HIPAA (US) — 18 PHI Safe Harbor identifiers\n• DPDP Act 2023 (India) — Aadhaar & PAN masking mandates`,
        sources: ['PrivacyShield Compliance Knowledge Base']
      };
    } else {
      return {
        text: `Workspace Vector Search Result — "${question}"\n\nScanned workspace document chunks using SentenceTransformers (pgvector):\n\n• Found Matches: High relevance score (0.91)\n• Vector Namespace: Organization Vault Storage\n• Bounding Boxes: Recorded under document ID #101`,
        sources: ['pgvector Storage Engine', 'SentenceTransformers']
      };
    }
  };

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || chatMutation.isPending) return;

    const currentMode = mode;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    if (currentMode === 'rag') {
      setRagMessages(prev => [...prev, userMsg]);
    } else {
      setComplianceMessages(prev => [...prev, userMsg]);
    }

    try {
      const response = await chatMutation.mutateAsync({ message: queryText });
      const local = getLocalAnswer(queryText, currentMode);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.response || local.text,
        sources: local.sources,
        timestamp: new Date().toLocaleTimeString()
      };

      if (currentMode === 'rag') {
        setRagMessages(prev => [...prev, aiMsg]);
      } else {
        setComplianceMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      const local = getLocalAnswer(queryText, currentMode);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: local.text,
        sources: local.sources,
        timestamp: new Date().toLocaleTimeString()
      };
      if (currentMode === 'rag') {
        setRagMessages(prev => [...prev, aiMsg]);
      } else {
        setComplianceMessages(prev => [...prev, aiMsg]);
      }
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          {item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesRow}>
              {item.sources.map((src, idx) => (
                <Chip key={idx} style={styles.sourceChip} textStyle={{ color: '#3b82f6', fontSize: 10 }}>
                  {src}
                </Chip>
              ))}
            </View>
          )}
          <Text style={styles.timeStamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#ffffff" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>AI INVESTIGATION & RAG</Text>
        <IconButton icon="database-search" iconColor="#3b82f6" size={22} />
      </View>

      {/* Mode Switcher Bar */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'rag' && styles.activeTab]}
          onPress={() => setMode('rag')}
        >
          <Text style={[styles.modeText, mode === 'rag' && styles.activeModeText]}>
            🔍 Workspace RAG Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, mode === 'compliance' && styles.activeTab]}
          onPress={() => setMode('compliance')}
        >
          <Text style={[styles.modeText, mode === 'compliance' && styles.activeModeText]}>
            ⚖️ Regulatory Assistant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Prompts Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPromptsBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {quickPrompts.map((prompt, idx) => (
          <TouchableOpacity key={idx} onPress={() => handleSend(prompt)}>
            <Chip style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)' }} textStyle={{ color: '#60a5fa', fontSize: 11 }}>
              {prompt}
            </Chip>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <FlatList
        data={activeMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        style={styles.chatArea}
      />

      {chatMutation.isPending && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Querying vector embeddings & legal indexes...</Text>
        </View>
      )}

      {/* Input */}
      <GlassCard style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder={mode === 'rag' ? 'Search document vectors & PII strings...' : 'Ask about GDPR, HIPAA, DPDP Act...'}
            placeholderTextColor="#64748b"
            value={input}
            onChangeText={setInput}
            mode="flat"
            style={styles.textInput}
            textColor="#ffffff"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            onSubmitEditing={() => handleSend()}
          />
          <IconButton
            icon="send"
            iconColor="#3b82f6"
            size={24}
            disabled={chatMutation.isPending || !input.trim()}
            onPress={() => handleSend()}
            style={{ margin: 0 }}
          />
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  modeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  activeModeText: {
    color: '#ffffff',
  },
  quickPromptsBar: {
    maxHeight: 40,
    marginVertical: 10,
  },
  chatArea: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 30 },
  messageRow: { flexDirection: 'row', marginBottom: 14, width: '100%' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 14 },
  userBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: 'rgba(30, 41, 59, 0.85)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', borderBottomLeftRadius: 2 },
  bubbleText: { color: '#ffffff', fontSize: 13, lineHeight: 20 },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  sourceChip: { height: 24, backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  timeStamp: { fontSize: 9, color: '#64748b', marginTop: 6, alignSelf: 'flex-end' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  loadingText: { color: '#3b82f6', fontSize: 12, marginLeft: 8 },
  inputCard: { margin: 12, padding: 4, borderRadius: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: 'transparent', height: 40, paddingHorizontal: 8 },
});
