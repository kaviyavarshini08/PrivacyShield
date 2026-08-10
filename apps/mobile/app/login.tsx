import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Text as RNText } from 'react-native';
import { TextInput, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore, API_URL } from '../src/store/authStore';
import axios from 'axios';

export default function Login() {
  const router = useRouter();
  const { login, verifyMfa, mfaRequiredEmail, loading, error } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  
  // Recovery / Password reset states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotQ1, setForgotQ1] = useState("What is your pet's name?");
  const [forgotQ2, setForgotQ2] = useState("What is your mother's maiden name?");
  const [forgotQ3, setForgotQ3] = useState("What city were you born in?");
  const [forgotA1, setForgotA1] = useState('');
  const [forgotA2, setForgotA2] = useState('');
  const [forgotA3, setForgotA3] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  // Sign Up states
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpA1, setSignUpA1] = useState('');
  const [signUpA2, setSignUpA2] = useState('');
  const [signUpA3, setSignUpA3] = useState('');
  const [signUpEmailError, setSignUpEmailError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    const cleanEmail = email.trim().toLowerCase();
    const emailVal = validateEmailDetails(cleanEmail);
    if (!emailVal.valid) {
      setLoginEmailError(emailVal.error || 'Invalid email address.');
      Alert.alert('Login Error', emailVal.error);
      return;
    }
    const res = await login(cleanEmail, password);
    if (res.status === 'success') {
      router.replace('/(tabs)');
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaCode) return;
    const success = await verifyMfa(mfaCode);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const validateEmailDetails = (emailStr: string): { valid: boolean; error?: string } => {
    const cleanEmail = emailStr.trim().toLowerCase();
    if (!cleanEmail) return { valid: false, error: "Please enter an email address." };

    const parts = cleanEmail.split('@');
    if (parts.length !== 2) return { valid: false, error: "Invalid email format. Please enter a valid email address." };
    const [prefix, domain] = parts;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return { valid: false, error: "Invalid email format. Please enter a valid email address (e.g. name@gmail.com)." };
    }

    const typoDomains: Record<string, string> = {
      'yahho.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yaho.co': 'yahoo.com', 'yaho.in': 'yahoo.com', 'yahoof.com': 'yahoo.com',
      'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmeil.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
      'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com', 'icld.com': 'icloud.com'
    };

    if (typoDomains[domain]) {
      return { valid: false, error: `Invalid email domain '${domain}'. Did you mean ${typoDomains[domain]}? Typo email domains are not allowed.` };
    }

    const allowedProviders = [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'yahoo.co.uk',
      'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
      'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'zoho.com', 'zoho.in',
      'aol.com', 'gmx.com', 'gmx.net', 'rediffmail.com', 'yandex.com', 'mail.ru', 'fastmail.com',
      'office365.com'
    ];

    const isValidProvider = allowedProviders.includes(domain);
    const isEduOrGov = domain.endsWith('.edu') || domain.endsWith('.gov') || domain.endsWith('.ac.in') || domain.endsWith('.edu.in');

    if (!isValidProvider && !isEduOrGov) {
      return { valid: false, error: `Invalid email domain '${domain}'. Please use a valid email address (e.g. xxxxxxx@gmail.com, yahoo.com, outlook.com).` };
    }

    return { valid: true };
  };

  const isStrongPassword = (pass: string) => {
    const minLength = pass.trim().length >= 6;
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const hasCapital = /[A-Z]/.test(pass);
    const hasDigit = /[0-9]/.test(pass);
    return minLength && hasSpecial && hasCapital && hasDigit;
  };

  const handleSignUpSubmit = async () => {
    if (!signUpEmail || !signUpPassword) {
      Alert.alert('Error', "Please provide email and password for registration.");
      return;
    }
    if (!signUpA1.trim() || !signUpA2.trim() || !signUpA3.trim()) {
      Alert.alert('Error', "Please answer all 3 security questions.");
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    const emailValidation = validateEmailDetails(cleanEmail);
    if (!emailValidation.valid) {
      setSignUpEmailError(emailValidation.error || "Invalid email address.");
      Alert.alert('Registration Error', emailValidation.error);
      return;
    }
    if (!isStrongPassword(signUpPassword)) {
      Alert.alert('Registration Error', "Password must be at least 6 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol (!@#$%^&*).");
      return;
    }

    setIsRegistering(true);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: cleanEmail,
        password: signUpPassword,
        full_name: signUpName || "New User",
        sec_q1: "What is your pet's name?",
        sec_a1: signUpA1.trim(),
        sec_q2: "What is your mother's maiden name?",
        sec_a2: signUpA2.trim(),
        sec_q3: "What city were you born in?",
        sec_a3: signUpA3.trim()
      });
      Alert.alert("Success", "Account registered successfully! Logging you in...");
      setShowSignUpModal(false);
      const res = await login(cleanEmail, signUpPassword);
      if (res.status === 'success') {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      let errDetail = "Registration failed. Please check your details and try again.";
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errDetail = detail;
      }
      Alert.alert('Registration Failed', errDetail);
      if (typeof detail === 'string' && detail.toLowerCase().includes('already exists')) {
        setEmail(cleanEmail);
        setShowSignUpModal(false);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFetchQuestions = async () => {
    if (!resetEmail) {
      Alert.alert('Error', "Please enter your registered email address.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/get-security-questions`, { 
        email: resetEmail.trim().toLowerCase() 
      });
      setForgotQ1(res.data?.q1 || "What is your pet's name?");
      setForgotQ2(res.data?.q2 || "What is your mother's maiden name?");
      setForgotQ3(res.data?.q3 || "What city were you born in?");
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('Error', "Failed to fetch security questions. Are you sure this email is registered?");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyQuestionsAndReset = async () => {
    if (!forgotA1.trim() || !forgotA2.trim() || !forgotA3.trim()) {
      Alert.alert('Error', "Please answer all 3 security questions.");
      return;
    }
    if (!forgotNewPass.trim() || forgotNewPass !== forgotConfirmPass) {
      Alert.alert('Error', "Passwords do not match or are empty.");
      return;
    }
    if (!isStrongPassword(forgotNewPass)) {
      Alert.alert('Error', "Password must be at least 6 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol (!@#$%^&*).");
      return;
    }

    setResetLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password-with-questions`, {
        email: resetEmail.trim().toLowerCase(),
        a1: forgotA1,
        a2: forgotA2,
        a3: forgotA3,
        new_password: forgotNewPass
      });
      Alert.alert("Success", res.data?.message || "Password updated successfully!");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword(forgotNewPass);
      setShowForgotPassword(false);
      setForgotStep(1);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Security verification failed. Please check your answers.";
      Alert.alert('Reset Failed', msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Only show on very small screens, otherwise we emulate the right pane */}
        <View style={styles.header}>
          <Text style={styles.title}>PRIVACY<Text style={styles.subTitle}>SHIELD</Text></Text>
        </View>

        {!mfaRequiredEmail ? (
          <View style={styles.card}>
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <Text style={styles.formTitle}>Welcome back</Text>
              <Text style={styles.formSubtitle}>Sign in to your account to continue</Text>
            </View>
            
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (val.trim()) {
                  const res = validateEmailDetails(val);
                  setLoginEmailError(res.valid ? '' : (res.error || 'Invalid email address'));
                } else {
                  setLoginEmailError('');
                }
              }}
              mode="outlined"
              autoCapitalize="none"
              style={styles.inputLight}
              textColor="#0f172a"
              outlineColor={loginEmailError ? "#ef4444" : "#e2e8f0"}
              activeOutlineColor={loginEmailError ? "#ef4444" : "#3b82f6"}
            />
            {loginEmailError ? (
              <RNText style={{ color: '#ef4444', fontSize: 11, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                ⚠️ {loginEmailError}
              </RNText>
            ) : null}
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              style={styles.inputLight}
              textColor="#0f172a"
              outlineColor="#e2e8f0"
              activeOutlineColor="#3b82f6"
            />
            
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#1E3A8A' }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => setShowSignUpModal(true)}>
                <Text style={[styles.linkText, { fontWeight: 'bold' }]}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.formTitle}>MFA Verification</Text>
            <Text style={[styles.formSubtitle, { marginTop: 12, textAlign: 'center' }]}>
              Enter the 6-digit OTP code from your authenticator app for {mfaRequiredEmail}.
            </Text>

            <TextInput
              label="Verification Code (OTP)"
              value={mfaCode}
              onChangeText={setMfaCode}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.inputLight, { marginTop: 20 }]}
              textColor="#0f172a"
              outlineColor="#e2e8f0"
              activeOutlineColor="#3b82f6"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#1E3A8A' }]}
              onPress={handleMfaVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Verify & Enter</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Forgot Password Modal (2-Step Security Questions) */}
      {showForgotPassword && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 400, maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.modalHeader}>
                <View style={styles.iconCircle}>
                  <IconButton icon="key" iconColor="#1E3A8A" size={24} style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.modalTitleDark}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    {forgotStep === 1 ? "Step 1: Enter email to fetch security questions" : "Step 2: Answer 3 security questions to update password"}
                  </Text>
                </View>
                <IconButton icon="close" iconColor="#64748b" size={24} onPress={() => { setShowForgotPassword(false); setForgotStep(1); }} style={{ margin: 0, alignSelf: 'flex-start' }} />
              </View>
              
              {forgotStep === 1 ? (
                <View>
                  <RNText style={styles.darkInputLabel}>Registered Email Address</RNText>
                  <TextInput
                    value={resetEmail}
                    placeholder="xxxxxxx@gmail.com"
                    placeholderTextColor="#64748b"
                    onChangeText={setResetEmail}
                    mode="outlined"
                    autoCapitalize="none"
                    style={styles.inputDark}
                    textColor="#ffffff"
                    outlineColor="#0f172a"
                    activeOutlineColor="#3b82f6"
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForgotPassword(false)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#218C7E' }]} onPress={handleFetchQuestions} disabled={resetLoading}>
                      {resetLoading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.actionButtonText}>Verify Email & Fetch Questions</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <RNText style={styles.darkInputLabelTeal}>Question 1: {forgotQ1}</RNText>
                  <TextInput value={forgotA1} onChangeText={setForgotA1} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="Your Answer 1..." placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                  
                  <RNText style={styles.darkInputLabelTeal}>Question 2: {forgotQ2}</RNText>
                  <TextInput value={forgotA2} onChangeText={setForgotA2} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="Your Answer 2..." placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                  
                  <RNText style={styles.darkInputLabelTeal}>Question 3: {forgotQ3}</RNText>
                  <TextInput value={forgotA3} onChangeText={setForgotA3} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="Your Answer 3..." placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <RNText style={styles.darkInputLabelGray}>New Password</RNText>
                      <TextInput value={forgotNewPass} onChangeText={setForgotNewPass} secureTextEntry mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="••••••••" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <RNText style={styles.darkInputLabelGray}>Confirm Password</RNText>
                      <TextInput value={forgotConfirmPass} onChangeText={setForgotConfirmPass} secureTextEntry mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="••••••••" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setForgotStep(1)}>
                      <Text style={styles.cancelButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#218C7E' }]} onPress={handleVerifyQuestionsAndReset} disabled={resetLoading}>
                      {resetLoading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.actionButtonText}>Verify & Update Password in DB</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 400, maxHeight: '95%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                  <IconButton icon="account-plus" iconColor="#06b6d4" size={24} style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.modalTitleDark}>Create Account</Text>
                  <Text style={styles.modalSubtitle}>Register for PrivacyShield with Account Recovery Questions</Text>
                </View>
                <IconButton icon="close" iconColor="#64748b" size={24} onPress={() => setShowSignUpModal(false)} style={{ margin: 0, alignSelf: 'flex-start' }} />
              </View>
              
              <RNText style={styles.darkInputLabel}>Full Name</RNText>
              <TextInput value={signUpName} onChangeText={setSignUpName} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="John Doe" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
              
              <RNText style={styles.darkInputLabel}>Email Address</RNText>
              <TextInput 
                value={signUpEmail} 
                onChangeText={(val) => {
                  setSignUpEmail(val);
                  if (val.trim()) {
                    const res = validateEmailDetails(val);
                    setSignUpEmailError(res.valid ? '' : (res.error || 'Invalid email address'));
                  } else {
                    setSignUpEmailError('');
                  }
                }} 
                mode="outlined" 
                autoCapitalize="none" 
                style={styles.compactInputDark} 
                textColor="#ffffff" 
                placeholder="xxxxxxx@gmail.com" 
                placeholderTextColor="#64748b" 
                outlineColor={signUpEmailError ? "#ef4444" : "#0f172a"} 
                activeOutlineColor={signUpEmailError ? "#ef4444" : "#3b82f6"} 
              />
              {signUpEmailError ? (
                <RNText style={{ color: '#ef4444', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                  ⚠️ {signUpEmailError}
                </RNText>
              ) : null}
              
              <RNText style={styles.darkInputLabel}>Password</RNText>
              <TextInput value={signUpPassword} onChangeText={setSignUpPassword} secureTextEntry mode="outlined" style={styles.inputDark} textColor="#ffffff" placeholder="••••••••" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />

              <View style={styles.securityBox}>
                <Text style={styles.securityBoxTitle}>Account Recovery Security Questions</Text>
                
                <RNText style={styles.securityBoxLabel}>Q1: What is your pet's name?</RNText>
                <TextInput value={signUpA1} onChangeText={setSignUpA1} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="Answer 1 (e.g. Fluffy)" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                
                <RNText style={styles.securityBoxLabel}>Q2: What is your mother's maiden name?</RNText>
                <TextInput value={signUpA2} onChangeText={setSignUpA2} mode="outlined" style={styles.compactInputDark} textColor="#ffffff" placeholder="Answer 2 (e.g. Smith)" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
                
                <RNText style={styles.securityBoxLabel}>Q3: What city were you born in?</RNText>
                <TextInput value={signUpA3} onChangeText={setSignUpA3} mode="outlined" style={[styles.compactInputDark, { marginBottom: 0 }]} textColor="#ffffff" placeholder="Answer 3 (e.g. New York)" placeholderTextColor="#64748b" outlineColor="#0f172a" activeOutlineColor="#3b82f6" />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSignUpModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#1E3A8A' }]} onPress={handleSignUpSubmit} disabled={isRegistering}>
                  {isRegistering ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.actionButtonText}>Register & Login</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Light theme background
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subTitle: {
    color: '#3b82f6',
  },
  card: {
    alignSelf: 'stretch',
    padding: 24,
    maxWidth: 400,
    width: '100%',
    marginHorizontal: 'auto',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  inputLight: {
    marginBottom: 16,
    backgroundColor: '#ffffff', // White input
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  linkText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#64748b',
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  /* Modals */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 17, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff', // White modal
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleDark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  darkInputLabel: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 8,
  },
  securityBoxLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 8,
  },
  darkInputLabelTeal: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  darkInputLabelGray: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  inputDark: {
    backgroundColor: '#0B1120', // Dark navy input
    marginBottom: 16,
  },
  compactInputDark: {
    backgroundColor: '#0B1120',
    marginBottom: 8,
    height: 48,
  },
  securityBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  securityBoxTitle: {
    color: '#06b6d4',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flex: 2,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  }
});
