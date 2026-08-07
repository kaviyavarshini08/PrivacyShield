import { useState, useEffect } from 'react';
import { Search, Download, FileText } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/index';
import { ComplianceService } from '../services/api';
import { toast } from 'sonner';

export function Compliance() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAuditLogs = () => {
    ComplianceService.getAuditLogs()
      .then(res => {
        if (Array.isArray(res.data)) {
          setAuditLogs(res.data);
        }
      })
      .catch(err => console.error("Failed to fetch audit logs", err));
  };

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];
  const filteredLogs = safeLogs.filter(log => {
    if (!log) return false;
    const actionStr = typeof log.action === 'string' ? log.action : String(log.action || '');
    const userStr = typeof log.user === 'object' && log.user ? (log.user.email || '') : String(log.user || '');
    const targetStr = typeof log.target === 'string' ? log.target : String(log.target || '');
    const term = (searchTerm || '').toLowerCase();
    return (
      actionStr.toLowerCase().includes(term) ||
      userStr.toLowerCase().includes(term) ||
      targetStr.toLowerCase().includes(term)
    );
  });

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs available to export.");
      return;
    }
    const headers = ["ID", "Action", "User", "Target", "Severity", "Time"];
    const csvRows = filteredLogs.map(l => [
      l.id,
      `"${l.action || ''}"`,
      `"${typeof l.user === 'object' && l.user ? l.user.email : (l.user || 'System')}"`,
      `"${l.target || 'Global'}"`,
      `"${(l.severity || 'low').toUpperCase()}"`,
      `"${l.time || 'Recently'}"`
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `privacyshield_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit logs exported to CSV successfully!");
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Live Audit Stream</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Center</h1>
          <p className="text-muted-foreground mt-1">Real-time data processing audit logs and regulatory security events based on uploaded documents.</p>
        </div>
      </div>

      <Card className="shadow-sm rounded-xl">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-9 h-10" 
              placeholder="Search audit logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleExportLogs}>
            <Download className="w-4 h-4 mr-2" /> Export Logs
          </Button>
        </div>
        
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No Audit Logs Recorded</p>
            <p className="text-xs">System events (user logins, document uploads, policy edits) will automatically log here in real time.</p>
          </div>
        ) : (
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
              {filteredLogs.map((log: any, idx: number) => {
                const userDisplay = typeof log.user === 'object' && log.user ? log.user.email : String(log.user || 'System');
                const severityDisplay = String(log.severity || 'low').toLowerCase();
                return (
                  <tr key={log.id || idx} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{log.action || 'Event'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{userDisplay}</td>
                    <td className="px-6 py-4 text-muted-foreground">{log.target || 'Global'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={severityDisplay === 'high' || severityDisplay === 'critical' ? 'destructive' : severityDisplay === 'medium' ? 'secondary' : 'default'}>
                        {severityDisplay.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{log.time || 'Recently'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
