import { useState } from 'react';
import { User, Bell, Shield, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Switch } from '../components/ui/index';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start bg-muted">
            <User className="w-4 h-4 mr-2" /> Account
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <Paintbrush className="w-4 h-4 mr-2" /> Appearance
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <Shield className="w-4 h-4 mr-2" /> Security
          </Button>
        </div>

        <div className="md:col-span-3 space-y-8">
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-full bg-[#0F766E] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  A
                </div>
                <Button variant="outline">Change Avatar</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input defaultValue="Admin User" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input defaultValue="admin@privacyshield.com" />
                </div>
              </div>
              <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how PrivacyShield looks on your device.</CardDescription>
            </CardHeader>
            <CardContent>
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

          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive alerts and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-0.5">
                  <p className="font-medium">Email Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive critical threat alerts via email.</p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-0.5">
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">In-app popups for processing completion.</p>
                </div>
                <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">Get a weekly summary of redaction analytics.</p>
                </div>
                <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
