import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Text, Card, HelperText, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { CyberButton, GlassCard } from '@privacyshield/ui';

const onboardingSlides = [
  {
    title: "AI INTEL PRIVACY SHIELD",
    desc: "Scan and quarantine sensitive PII, national IDs, and high-entropy API keys using zero-trust local inference models.",
    icon: "shield-lock-outline"
  },
  {
    title: "ISOLATION VAULT",
    desc: "Quarantine suspicious assets and apply cryptographic redaction workflows to attachments and logs dynamically.",
    icon: "folder-lock-outline"
  },
  {
    title: "COMPLIANCE & AUDIT SOC",
    desc: "Gain real-time compliance assurance logs, multi-tenant workspace context isolation, and immutably signed audits.",
    icon: "chart-timeline-variant"
  }
];

export default function Login() {
  const router = useRouter();
  const { login, verifyMfa, mfaRequiredEmail, loading, error } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  
  // Onboarding & Biometrics States
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBiometrics, setShowBiometrics] = useState(false);
  const [biometricsStage, setBiometricsStage] = useState<'scanning' | 'verifying' | 'success'>('scanning');

  const handleLogin = async () => {
    if (!email || !password) return;
    const res = await login(email, password);
    if (res.status === 'success') {
      router.replace('/dashboard');
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaCode) return;
    const success = await verifyMfa(mfaCode);
    if (success) {
      router.replace('/dashboard');
    }
  };

  const handleOAuthMock = async (provider: 'google' | 'github') => {
    alert(`Triggering standard ${provider} secure authorization prompt...`);
  };

  // Biometrics scan simulation
  const triggerBiometrics = () => {
    setShowBiometrics(true);
    setBiometricsStage('scanning');
  };

  useEffect(() => {
    if (!showBiometrics) return;

    // Scan phase (1.2s)
    const scanTimeout = setTimeout(() => {
      setBiometricsStage('verifying');
      
      // Verification phase (1.2s)
      const verifyTimeout = setTimeout(() => {
        setBiometricsStage('success');
        
        // Finalize (0.8s)
        const successTimeout = setTimeout(() => {
          setShowBiometrics(false);
          router.replace('/dashboard');
        }, 800);

        return () => clearTimeout(successTimeout);
      }, 1200);

      return () => clearTimeout(verifyTimeout);
    }, 1200);

    return () => clearTimeout(scanTimeout);
  }, [showBiometrics]);

  if (showOnboarding) {
    return (
      <View style={styles.onboardingContainer}>
        <View style={styles.onboardingHeader}>
          <Text style={styles.title}>PRIVACY<Text style={styles.subTitle}>SHIELD</Text></Text>
          <Text style={styles.tagline}>AI-Powered Sensitive Data Guard</Text>
        </View>

        <View style={styles.slideContainer}>
          <IconButton icon={onboardingSlides[currentSlide].icon} size={80} iconColor="#3b82f6" style={styles.slideIcon} />
          <Text style={styles.slideTitle}>{onboardingSlides[currentSlide].title}</Text>
          <Text style={styles.slideDesc}>{onboardingSlides[currentSlide].desc}</Text>
        </View>

        <View style={styles.dotContainer}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlide === index ? styles.activeDot : styles.inactiveDot
              ]}
            />
          ))}
        </View>

        <View style={styles.onboardingActions}>
          {currentSlide < onboardingSlides.length - 1 ? (
            <View style={styles.onboardingRow}>
              <CyberButton
                title="Skip"
                variant="secondary"
                onPress={() => setShowOnboarding(false)}
                style={styles.onboardingHalfBtn}
              />
              <CyberButton
                title="Next"
                onPress={() => setCurrentSlide(prev => prev + 1)}
                style={styles.onboardingHalfBtn}
              />
            </View>
          ) : (
            <CyberButton
              title="Acknowledge & Access"
              onPress={() => setShowOnboarding(false)}
              style={styles.onboardingFullBtn}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>PRIVACY<Text style={styles.subTitle}>SHIELD</Text></Text>
          <Text style={styles.tagline}>AI-Powered Sensitive Data Guard</Text>
        </View>

        {!mfaRequiredEmail ? (
          <GlassCard style={styles.card}>
            <Text style={styles.formTitle}>Secure Access Portal</Text>
            
            <TextInput
              label="Cybersecurity ID (Email)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              style={styles.input}
              textColor="#ffffff"
            />
            
            <TextInput
              label="Passphrase"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              textColor="#ffffff"
            />
            
            {error && <Text style={styles.errorText}>{error}</Text>}

            <CyberButton
              title="Authenticate"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
            />

            <CyberButton
              title="Sign in with Biometrics"
              onPress={triggerBiometrics}
              variant="secondary"
              style={[styles.button, { marginTop: 12 }]}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.oauthRow}>
              <CyberButton
                title="Google"
                onPress={() => handleOAuthMock('google')}
                variant="secondary"
                style={styles.oauthButton}
              />
              <CyberButton
                title="GitHub"
                onPress={() => handleOAuthMock('github')}
                variant="secondary"
                style={styles.oauthButton}
              />
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={styles.formTitle}>MFA Code Verification</Text>
            <Text style={styles.mfaInfo}>
              Enter the 6-digit OTP code from your authenticator app for {mfaRequiredEmail}.
            </Text>

            <TextInput
              label="Verification Code (OTP)"
              value={mfaCode}
              onChangeText={setMfaCode}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              textColor="#ffffff"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <CyberButton
              title="Verify & Enter"
              onPress={handleMfaVerify}
              loading={loading}
              style={styles.button}
            />
          </GlassCard>
        )}
      </ScrollView>

      {/* Biometric Scan Modal Overlay */}
      {showBiometrics && (
        <View style={styles.biometricOverlay}>
          <GlassCard style={styles.biometricCard}>
            <Text style={styles.biometricTitle}>SECURE BIOMETRIC SIGN-IN</Text>
            
            <View style={styles.biometricScanArea}>
              {biometricsStage === 'scanning' && (
                <View style={styles.biometricStatusContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" style={styles.biometricSpinner} />
                  <IconButton icon="face-recognition" size={64} iconColor="#3b82f6" />
                  <Text style={styles.biometricStatus}>Initiating Face ID scan...</Text>
                </View>
              )}
              {biometricsStage === 'verifying' && (
                <View style={styles.biometricStatusContainer}>
                  <ActivityIndicator size="large" color="#14b8a6" style={styles.biometricSpinner} />
                  <IconButton icon="fingerprint" size={64} iconColor="#14b8a6" />
                  <Text style={styles.biometricStatus}>Verifying credentials...</Text>
                </View>
              )}
              {biometricsStage === 'success' && (
                <View style={styles.biometricStatusContainer}>
                  <IconButton icon="check-decagram" size={64} iconColor="#10b981" />
                  <Text style={[styles.biometricStatus, { color: '#10b981', fontWeight: 'bold' }]}>ACCESS GRANTED</Text>
                </View>
              )}
            </View>

            {biometricsStage !== 'success' && (
              <CyberButton
                title="Cancel"
                variant="secondary"
                onPress={() => setShowBiometrics(false)}
                style={{ marginTop: 20 }}
              />
            )}
          </GlassCard>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Dark slate 950
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subTitle: {
    color: '#3b82f6', // Cyber Blue
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#0f172a',
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: 'bold',
  },
  oauthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  oauthButton: {
    flex: 0.48,
  },
  mfaInfo: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  // Onboarding Styles
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'space-between',
    padding: 32,
    paddingTop: 80,
  },
  onboardingHeader: {
    alignItems: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 40,
  },
  slideIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#3b82f6',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  onboardingActions: {
    width: '100%',
  },
  onboardingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  onboardingHalfBtn: {
    flex: 0.48,
  },
  onboardingFullBtn: {
    width: '100%',
  },
  // Biometrics Styles
  biometricOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 17, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  biometricCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 24,
    textAlign: 'center',
  },
  biometricScanArea: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  biometricStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricSpinner: {
    position: 'absolute',
    transform: [{ scale: 2.2 }],
    opacity: 0.4,
  },
  biometricIcon: {
    marginVertical: 12,
  },
  biometricStatus: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});
