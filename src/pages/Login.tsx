import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(async () => {
      try {
        await login(email || 'admin@company.com', password);
        setIsLoading(false);
        navigate('/dashboard');
      } catch (e) {
        setIsLoading(false);
        alert("Authentication failed. Is the backend running?");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left Pane - Gradient */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1E3A8A] via-[#0F766E] to-[#06B6D4] p-12 flex-col justify-center text-white relative overflow-hidden">
        <div className="absolute top-12 left-12 flex items-center space-x-3">
          <Shield className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight">PrivacyShield</span>
        </div>
        
        <div className="max-w-md mt-16 z-10">
          <h1 className="text-4xl font-bold leading-tight mb-6">
            AI-Powered Document Redaction & Cryptographic Vault
          </h1>
          
          <div className="space-y-6 mt-12">
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Automatic PII Detection</h3>
                <p className="text-white/80 text-sm mt-1">AI detects Aadhaar, PAN, phone numbers, emails, and addresses</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Military-Grade Encryption</h3>
                <p className="text-white/80 text-sm mt-1">Secure vault with role based access control</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-4 h-4 text-white" />
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

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full h-11 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" className="h-11">
                Google
              </Button>
              <Button variant="outline" type="button" className="h-11">
                Microsoft
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account? <a href="#" className="text-primary font-medium hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
