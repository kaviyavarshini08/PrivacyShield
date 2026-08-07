import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, X, KeyRound, Mail, ArrowLeft, UserPlus, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AuthService } from '../services/api';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotQ1, setForgotQ1] = useState("What is your pet's name?");
  const [forgotQ2, setForgotQ2] = useState("What is your mother's maiden name?");
  const [forgotQ3, setForgotQ3] = useState("What city were you born in?");
  const [forgotA1, setForgotA1] = useState('');
  const [forgotA2, setForgotA2] = useState('');
  const [forgotA3, setForgotA3] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  // Sign Up modal state
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpA1, setSignUpA1] = useState('');
  const [signUpA2, setSignUpA2] = useState('');
  const [signUpA3, setSignUpA3] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    
    try {
      await login(cleanEmail, password);
      setIsLoading(false);
      navigate('/dashboard');
    } catch (e: any) {
      setIsLoading(false);
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      const msg = detail || "Authentication failed. Is the backend running?";
      toast.error(msg);

      if (status === 404 || (typeof detail === 'string' && detail.toLowerCase().includes('account does not exist'))) {
        setSignUpEmail(cleanEmail);
        setShowSignUpModal(true);
      }
    }
  };

  const handleFetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await AuthService.getSecurityQuestions(cleanEmail);
      setForgotQ1(res.data?.q1 || "What is your pet's name?");
      setForgotQ2(res.data?.q2 || "What is your mother's maiden name?");
      setForgotQ3(res.data?.q3 || "What city were you born in?");
      setForgotStep(2);
      toast.success("Security questions loaded! Answer all 3 questions to reset your password.");
    } catch (err: any) {
      toast.error("Failed to fetch security questions.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyQuestionsAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotA1.trim() || !forgotA2.trim() || !forgotA3.trim()) {
      toast.error("Please answer all 3 security questions.");
      return;
    }
    if (!forgotNewPass.trim()) {
      toast.error("Please enter your new password.");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      toast.error("New password and confirmation password do not match.");
      return;
    }
    if (forgotNewPass.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await AuthService.resetPasswordWithQuestions({
        email: resetEmail.trim().toLowerCase(),
        a1: forgotA1,
        a2: forgotA2,
        a3: forgotA3,
        new_password: forgotNewPass
      });
      toast.success(res.data?.message || "Security answers verified! Password updated in database successfully!");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword(forgotNewPass);
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotA1('');
      setForgotA2('');
      setForgotA3('');
      setForgotNewPass('');
      setForgotConfirmPass('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Security verification failed. Please check your answers.";
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail || !signUpPassword) {
      toast.error("Please provide email and password for registration.");
      return;
    }
    if (!signUpA1.trim() || !signUpA2.trim() || !signUpA3.trim()) {
      toast.error("Please answer all 3 security questions for account recovery.");
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsRegistering(true);
    try {
      await AuthService.register({
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
      toast.success("Account registered successfully! Auto-populating login credentials...");
      setEmail(cleanEmail);
      setPassword(signUpPassword);
      setShowSignUpModal(false);
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpA1('');
      setSignUpA2('');
      setSignUpA3('');
    } catch (err: any) {
      let errDetail = "Registration failed. Please check your details and try again.";
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errDetail = detail;
      } else if (Array.isArray(detail)) {
        errDetail = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (err.message) {
        errDetail = err.message;
      }
      toast.error(errDetail);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Pane - Branding & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A8A] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="z-10">
          <div className="flex items-center space-x-3">
            <Shield className="w-10 h-10 text-white" />
            <span className="text-2xl font-bold tracking-wider">PRIVACY<span className="text-cyan-400">SHIELD</span></span>
          </div>
        </div>

        <div className="z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Automated PII Redaction & Enterprise Data Security
          </h1>
          <p className="text-white/80 text-lg">
            Scan documents, quarantine confidential entities, and protect sensitive identity data with zero-trust local inference models.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Zero-Trust Isolation</h3>
                <p className="text-white/80 text-sm mt-1">Multi-tenant context isolation and cryptographic payload signing</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Presidio AI Models</h3>
                <p className="text-white/80 text-sm mt-1">Detect Aadhaar, PAN Cards, API keys, and sensitive tokens automatically</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Compliance Analytics</h3>
                <p className="text-white/80 text-sm mt-1">Complete audit trails and activity monitoring</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract shapes for background */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                placeholder="admin@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setResetEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-sm text-primary hover:underline font-medium focus:outline-none"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full h-11 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={() => setShowSignUpModal(true)}
              className="text-primary font-medium hover:underline focus:outline-none"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep(1);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Reset Password</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {forgotStep === 1 ? "Step 1: Enter email to fetch security questions" : "Step 2: Answer 3 security questions to update password"}
                </p>
              </div>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleFetchQuestions} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-1.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>Registered Email Address</span>
                  </label>
                  <Input 
                    type="email" 
                    placeholder="yourname@gmail.com" 
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForgotModal(false)} 
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isResetting}
                    className="flex-1 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-medium"
                  >
                    {isResetting ? "Fetching Questions..." : "Verify Email & Fetch Questions"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyQuestionsAndReset} className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-400">Question 1: {forgotQ1}</label>
                    <Input 
                      type="text" 
                      placeholder="Your Answer 1..." 
                      value={forgotA1}
                      onChange={(e) => setForgotA1(e.target.value)}
                      required
                      className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-400">Question 2: {forgotQ2}</label>
                    <Input 
                      type="text" 
                      placeholder="Your Answer 2..." 
                      value={forgotA2}
                      onChange={(e) => setForgotA2(e.target.value)}
                      required
                      className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-400">Question 3: {forgotQ3}</label>
                    <Input 
                      type="text" 
                      placeholder="Your Answer 3..." 
                      value={forgotA3}
                      onChange={(e) => setForgotA3(e.target.value)}
                      required
                      className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      required
                      className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      required
                      className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setForgotStep(1)} 
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isResetting}
                    className="flex-1 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold"
                  >
                    {isResetting ? "Verifying..." : "Verify & Update Password in DB"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Create Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Register for PrivacyShield with Account Recovery Questions</p>
              </div>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1.5">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <span>Full Name</span>
                </label>
                <Input 
                  type="text" 
                  placeholder="John Doe" 
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  required
                  className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>Email Address</span>
                </label>
                <Input 
                  type="email" 
                  placeholder="yourname@gmail.com" 
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                  className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <span>Password</span>
                </label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                />
              </div>



              {/* 3 Security Questions Setup */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3 pt-3">
                <p className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Account Recovery Security Questions</span>
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Q1: What is your pet's name?</label>
                  <Input 
                    type="text" 
                    placeholder="Answer 1 (e.g. Fluffy)" 
                    value={signUpA1}
                    onChange={(e) => setSignUpA1(e.target.value)}
                    required
                    className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Q2: What is your mother's maiden name?</label>
                  <Input 
                    type="text" 
                    placeholder="Answer 2 (e.g. Smith)" 
                    value={signUpA2}
                    onChange={(e) => setSignUpA2(e.target.value)}
                    required
                    className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Q3: What city were you born in?</label>
                  <Input 
                    type="text" 
                    placeholder="Answer 3 (e.g. New York)" 
                    value={signUpA3}
                    onChange={(e) => setSignUpA3(e.target.value)}
                    required
                    className="h-10 text-sm bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700 focus:border-cyan-500 font-medium px-3"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowSignUpModal(false)} 
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isRegistering}
                  className="flex-1 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white font-bold"
                >
                  {isRegistering ? "Registering..." : "Create Account & Save Answers"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
