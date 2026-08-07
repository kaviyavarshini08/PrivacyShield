import { useState, useEffect } from 'react';
import { User as UserIcon, Shield, Paintbrush, KeyRound, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/index';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/api';
import { toast } from 'sonner';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, refreshProfile, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<'account' | 'appearance' | 'security'>('account');

  // Account State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Security State (Password Change)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Helper to format default name from email
  const deriveNameFromEmail = (emailStr: string) => {
    if (!emailStr) return 'User';
    const localPart = emailStr.split('@')[0];
    return localPart
      .replace(/[._\-\d]+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'User';
  };

  useEffect(() => {
    if (user) {
      const derived = user.full_name && user.full_name !== 'User' && user.full_name !== 'New User' 
        ? user.full_name 
        : deriveNameFromEmail(user.email);
      setFullName(derived);
      setEmail(user.email || '');
    }

    AuthService.getProfile()
      .then((res) => {
        if (res.data) {
          const profile = res.data;
          const name = profile.full_name && profile.full_name !== 'User' && profile.full_name !== 'New User'
            ? profile.full_name
            : deriveNameFromEmail(profile.email);
          setFullName(name);
          setEmail(profile.email || '');
        }
      })
      .catch((err) => console.error("Could not fetch user profile", err));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter a valid full name.");
      return;
    }
    setIsSaving(true);
    try {
      await AuthService.updateProfile({ full_name: fullName.trim() });
      await refreshProfile();
      toast.success("Profile name updated in database successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update profile name.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please enter your current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    setIsChangingPass(true);
    try {
      await AuthService.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success("Password updated in database successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to change password. Verify your current password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSignOut = () => {
    toast.success("Signed out successfully.");
    logout();
  };

  const avatarLetter = fullName ? fullName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U');

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences and application settings.</p>
        </div>
        <Button 
          variant="destructive"
          onClick={handleSignOut}
          className="font-bold flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sub-Tabs */}
        <div className="md:col-span-1 space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('account')}
            className={`w-full justify-start ${activeSection === 'account' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <UserIcon className="w-4 h-4 mr-2 text-primary" /> Account
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('appearance')}
            className={`w-full justify-start ${activeSection === 'appearance' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <Paintbrush className="w-4 h-4 mr-2 text-primary" /> Appearance
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('security')}
            className={`w-full justify-start ${activeSection === 'security' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <Shield className="w-4 h-4 mr-2 text-primary" /> Security
          </Button>
        </div>

        {/* Dynamic Section Contents */}
        <div className="md:col-span-3 space-y-8">
          
          {/* SECTION 1: ACCOUNT */}
          {activeSection === 'account' && (
            <Card className="shadow-sm rounded-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information and registered email address.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    VERIFIED USER
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 rounded-full bg-[#0F766E] flex items-center justify-center text-white text-3xl font-extrabold shadow-md">
                    {avatarLetter}
                  </div>
                  <div>
                    <p className="font-bold text-xl text-foreground">{fullName || 'User Profile'}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Your Full Name"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address (Read-only)</label>
                    <Input 
                      value={email} 
                      disabled
                      readOnly
                      placeholder="yourname@gmail.com"
                      className="h-10 bg-muted/40 cursor-not-allowed text-muted-foreground opacity-80"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-medium">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: APPEARANCE */}
          {activeSection === 'appearance' && (
            <Card className="shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Appearance & Theme</CardTitle>
                <CardDescription>Customize how PrivacyShield looks on your device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium">Theme Preference</p>
                      <p className="text-sm text-muted-foreground">Select light, dark, or system default.</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => setTheme('system')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        System
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}



          {/* SECTION 4: SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <Card className="shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-primary" />
                    <span>Change Password</span>
                  </CardTitle>
                  <CardDescription>Update your login password securely.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <Input 
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm New Password</label>
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={isChangingPass} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-medium">
                      {isChangingPass ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
