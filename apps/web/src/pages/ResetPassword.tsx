import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, KeyRound, Check, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AuthService } from '../services/api';
import { toast } from 'sonner';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing password reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Reset token is missing from the link URL.");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation password do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await AuthService.confirmResetPassword(token, newPassword);
      toast.success(res.data?.message || "Password updated in database successfully!");
      setIsCompleted(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to confirm password reset. Token may be expired.";
      toast.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background items-center justify-center p-6">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 pb-2 border-b border-border">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-xs text-muted-foreground">PrivacyShield Security Verification</p>
          </div>
        </div>

        {isCompleted ? (
          <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Password Reset Complete!</h3>
            <p className="text-sm text-muted-foreground">
              Your password has been updated in PostgreSQL database. Redirecting to login...
            </p>
            <Button onClick={() => navigate('/login')} className="w-full bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white">
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1.5">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span>New Password</span>
              </label>
              <Input 
                type="password" 
                placeholder="Enter new password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1.5">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span>Confirm New Password</span>
              </label>
              <Input 
                type="password" 
                placeholder="Re-enter new password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="pt-2 space-y-3">
              <Button 
                type="submit" 
                disabled={isSubmitting || !token} 
                className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-medium"
              >
                {isSubmitting ? "Updating Password in Database..." : "Reset Password & Commit to DB"}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => navigate('/login')} 
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
