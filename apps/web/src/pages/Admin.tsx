import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Search, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Switch, Badge } from '../components/ui/index';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { AdminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_USERS_LIST = [
  { id: 1, name: 'John Doe', email: 'john@company.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@company.com', role: 'Manager', status: 'Active' },
  { id: 3, name: 'Mike Ross', email: 'mike@company.com', role: 'Viewer', status: 'Inactive' },
];

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState<any[]>(DEFAULT_USERS_LIST);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState(false);
  const [strictUpload, setStrictUpload] = useState(true);

  const fetchUsers = () => {
    AdminService.getUsers()
      .then((res) => setUsersList(res.data))
      .catch((err) => console.error("Failed to load users", err));
  };

  const fetchPolicies = () => {
    AdminService.getSecurityPolicies()
      .then((res) => {
        setMfaEnabled(res.data.mfa_enabled);
        setAutoLock(res.data.auto_lock);
        setStrictUpload(res.data.strict_upload);
      })
      .catch((err) => console.error("Failed to load security policies", err));
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchPolicies();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 max-w-[1400px] mx-auto p-6">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border-destructive/30 bg-destructive/5 shadow-lg rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The Admin Panel is reserved exclusively for Organization Administrators. Your logged in account role is <strong className="uppercase text-foreground">{user?.role || 'USER'}</strong>.
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard')} className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-medium">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleMfaToggle = (val: boolean) => {
    setMfaEnabled(val);
    AdminService.updateSecurityPolicies({ mfa_enabled: val })
      .then(() => toast.success("MFA policy updated"))
      .catch(() => toast.error("Failed to update MFA policy"));
  };

  const handleAutoLockToggle = (val: boolean) => {
    setAutoLock(val);
    AdminService.updateSecurityPolicies({ auto_lock: val })
      .then(() => toast.success("Session lock policy updated"))
      .catch(() => toast.error("Failed to update auto-lock policy"));
  };

  const handleStrictUploadToggle = (val: boolean) => {
    setStrictUpload(val);
    AdminService.updateSecurityPolicies({ strict_upload: val })
      .then(() => toast.success("Upload rules policy updated"))
      .catch(() => toast.error("Failed to update upload policy"));
  };


  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage roles, permissions, and global security policies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
              <div className="space-y-1">
                <CardTitle className="text-xl">User Management</CardTitle>
                <CardDescription>Manage user roles and access permissions.</CardDescription>
              </div>
              <Button>Add User</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 bg-muted/30">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9 h-10 bg-background" placeholder="Search users..." />
                </div>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersList.map(user => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={user.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-white' : ''}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Global Security Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Require MFA</p>
                  <p className="text-sm text-muted-foreground">Force multi-factor authentication for all users.</p>
                </div>
                <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Auto-lock Sessions</p>
                  <p className="text-sm text-muted-foreground">Lock inactive sessions after 15 minutes.</p>
                </div>
                <Switch checked={autoLock} onCheckedChange={handleAutoLockToggle} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Strict Upload Rules</p>
                  <p className="text-sm text-muted-foreground">Only allow predefined file formats in Workspace.</p>
                </div>
                <Switch checked={strictUpload} onCheckedChange={handleStrictUploadToggle} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-xl bg-muted/50 border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Encryption Keys</h3>
                <p className="text-sm text-muted-foreground mt-1">Manage AES-256 vault rotation keys securely.</p>
              </div>
              <Button variant="outline" className="w-full">Manage Keys</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
