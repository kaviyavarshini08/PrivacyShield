import { useState } from 'react';
import { Search, Download, AlertTriangle, ShieldAlert, Activity, ShieldCheck, Monitor, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/index';

const auditLogs = [
  { id: 1, action: 'Role Update', user: 'Admin User', target: 'John Doe', time: '10 mins ago', severity: 'low' },
  { id: 2, action: 'Bulk Download', user: 'Finance Lead', target: 'Vault (Q1 Reports)', time: '1 hour ago', severity: 'medium' },
  { id: 3, action: 'Policy Change', user: 'System', target: 'Retention Rules', time: '3 hours ago', severity: 'high' },
];

const accessHistory = [
  { id: 1, user: 'Jane Smith', device: 'MacBook Pro', ip: '192.168.1.45', location: 'New York, US', time: '2 mins ago', status: 'success' },
  { id: 2, user: 'Unknown', device: 'Unknown Device', ip: '45.22.11.90', location: 'Moscow, RU', time: '15 mins ago', status: 'blocked' },
];

export function Compliance() {
  const [activeTab, setActiveTab] = useState('audit');

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Center</h1>
        <p className="text-muted-foreground mt-1">Audit logs, access history, and real-time security alerts.</p>
      </div>

      <Tabs>
        <TabsList className="mb-6">
          <TabsTrigger active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>Audit Logs</TabsTrigger>
          <TabsTrigger active={activeTab === 'access'} onClick={() => setActiveTab('access')}>Access History</TabsTrigger>
          <TabsTrigger active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>User Activity</TabsTrigger>
          <TabsTrigger active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')}>Threat Alerts</TabsTrigger>
        </TabsList>

        <TabsContent active={activeTab === 'audit'}>
          <Card className="shadow-sm rounded-xl">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 h-10" placeholder="Search audit logs..." />
              </div>
              <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export Logs</Button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Severity</th>
                  <th className="px-6 py-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{log.action}</td>
                    <td className="px-6 py-4 text-muted-foreground">{log.user}</td>
                    <td className="px-6 py-4 text-muted-foreground">{log.target}</td>
                    <td className="px-6 py-4">
                      <Badge variant={log.severity === 'high' ? 'destructive' : log.severity === 'medium' ? 'secondary' : 'default'}>
                        {log.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent active={activeTab === 'access'}>
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Access History Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pl-4 border-l-2 border-border ml-2">
                {accessHistory.map(access => (
                  <div key={access.id} className="relative">
                    <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-background ${access.status === 'blocked' ? 'bg-destructive' : 'bg-emerald-500'}`}></div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{access.user}</p>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Monitor className="w-4 h-4" /> {access.device} • {access.ip} • {access.location}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{access.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent active={activeTab === 'activity'}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">Currently logged in</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45m 12s</div>
                <p className="text-xs text-emerald-500">+12% from last week</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Departments Active</CardTitle>
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8 / 12</div>
                <p className="text-xs text-muted-foreground">HR & Finance leading</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent active={activeTab === 'alerts'}>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Multiple Failed Login Attempts</h4>
                <p className="text-sm text-destructive/80 mt-1">IP 45.22.11.90 attempted to login 15 times in the last 5 minutes. IP has been temporarily blocked.</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-700 dark:text-amber-500">Unusual Download Volume</h4>
                <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">User 'Finance Lead' downloaded 5GB of data from the Secure Vault outside of normal business hours.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
