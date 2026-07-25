import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { TextInput, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useChat } from '../src/api/query';
import { GlassCard, CyberButton } from '@privacyshield/ui';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Greetings. I am the PrivacyShield AI Guard. Ask me about PII risk scanning, de-identification steps, or compliance reports under GDPR, HIPAA, and DPDP Act.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const chatMutation = useChat();

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    try {
      const response = await chatMutation.mutateAsync({ message: userMsg.text });
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.response
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'System link failure. Unable to contact AI services. Please verify backend state.'
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          iconColor="#ffffff"
          size={24}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>AI PRIVACY COMPLIANCE GUARD</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        style={styles.chatArea}
      />

      {chatMutation.isPending && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>AI is decapping security logs...</Text>
        </View>
      )}

      <GlassCard style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Inquire about GDPR / HIPAA / DPDP logs..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            mode="flat"
            style={styles.textInput}
            textColor="#ffffff"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            onSubmitEditing={handleSend}
          />
          <IconButton
            icon="send"
            iconColor="#3b82f6"
            size={24}
            disabled={chatMutation.isPending || !inputText.trim()}
            onPress={handleSend}
            style={styles.sendBtn}
          />
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3b82f6', // Cyber Blue
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // Slate 800
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
  },
  loadingText: {
    color: '#3b82f6',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  inputCard: {
    margin: 16,
    padding: 6,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 40,
    paddingHorizontal: 12,
  },
  sendBtn: {
    margin: 0,
  },
});
