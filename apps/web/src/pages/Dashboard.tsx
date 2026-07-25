import { useState, useEffect } from 'react';
import { 
  FileText, Shield, Lock, AlertTriangle, Activity, 
  Terminal, Globe, Cpu, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';

const trendData = [
  { name: 'Mon', documents: 120, violations: 45, safe: 75 },
  { name: 'Tue', documents: 132, violations: 58, safe: 74 },
  { name: 'Wed', documents: 101, violations: 30, safe: 71 },
  { name: 'Thu', documents: 134, violations: 72, safe: 62 },
  { name: 'Fri', documents: 90, violations: 25, safe: 65 },
  { name: 'Sat', documents: 40, violations: 10, safe: 30 },
  { name: 'Sun', documents: 30, violations: 5, safe: 25 },
];

const piiBreakdown = [
  { type: 'Aadhaar (National ID)', count: 342, percentage: 19.0, color: '#06b6d4' },
  { type: 'PAN Card (Tax ID)', count: 287, percentage: 15.9, color: '#14b8a6' },
  { type: 'Phone Number', count: 456, percentage: 25.3, color: '#f59e0b' },
  { type: 'Email Address', count: 521, percentage: 28.9, color: '#10b981' },
  { type: 'High Entropy Secrets', count: 198, percentage: 11.0, color: '#ef4444' },
];

const INITIAL_THREAT_FEED = [
  {
    time: "10m ago",
    type: "IMPOSSIBLE_TRAVEL",
    message: "Impossible Travel Alert: user login in London followed by New York within 10 minutes.",
    ip: "185.86.151.42 -> 104.244.42.12",
    severity: "critical"
  },
  {
    time: "24m ago",
    type: "FEEDBACK_LOOP",
    message: "Calibration Engine auto-tuned Aadhaar matcher threshold to 0.72 due to analyst correction.",
    ip: "System Kernel",
    severity: "info"
  },
  {
    time: "1h ago",
    type: "VAULT_ACCESS",
    message: "Compliance audit report exported by security Analyst (GDPR Article 32 checklist).",
    ip: "103.5.15.111",
    severity: "warning"
  },
  {
    time: "3h ago",
    type: "MALWARE_SCAN",
    message: "Document scanning complete: 0 malware traces, 14 sensitive tokens quarantined.",
    ip: "Celery Worker Node-3",
    severity: "success"
  }
];

const MOCK_THREAT_TEMPLATES = [
  {
    type: "IP_REPUTATION_BLOCKED",
    message: "Malicious IP address 198.51.100.72 blocked by Sentinel Guard rule #108.",
    ip: "198.51.100.72",
    severity: "critical"
  },
  {
    type: "API_ABUSE_DETECTED",
    message: "Rate limit exceeded: 450 requests/sec from client token auth_tkn_81a7d.",
    ip: "Gateway Router v2",
    severity: "warning"
  },
  {
    type: "PII_QUARANTINED",
    message: "Tax ID (PAN Card) detected in transaction log attachment, quarantined under isolation vault.",
    ip: "Analysis Pipeline v1.2",
    severity: "success"
  },
  {
    type: "COMPLIANCE_DRIFT",
    message: "Compliance drift: Tenant Workspace B disabled end-to-end payload signing.",
    ip: "Audit Agent v4",
    severity: "warning"
  },
  {
    type: "MALWARE_PREVENTED",
    message: "ClamAV scanner blocked upload: EICAR malware signature detected in scanned PDF.",
    ip: "Celery Worker Node-2",
    severity: "critical"
  },
  {
    type: "ORGANIZATION_REKEY",
    message: "Organization master envelope key rotated successfully using HSM KMS.",
    ip: "System Cryptographer",
    severity: "info"
  },
  {
    type: "FEEDBACK_LOOP_CALIBRATED",
    message: "HuggingFace transformer model feedback applied: increased PII entity detection weights by 0.05.",
    ip: "AI Optimization Loop",
    severity: "info"
  }
];

const TOUR_STEPS = [
  {
    title: "SOC SECURITY CENTER",
    desc: "This is your Security Operations Center. It monitors incoming connection parameters and calculates threat severity indicators in real-time.",
  },
  {
    title: "PII DETECTION VECTORS",
    desc: "A live breakdown of detected sensitive entities (such as Aadhaar, PAN Cards, Secrets, and emails) quarantined by the AI pipelines.",
  },
  {
    title: "LIVE TELEMETRY STREAM",
    desc: "Real-time audit log flow showing security events from microservice workers. Simulated threat activities appear here automatically.",
  }
];

export function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [threats, setThreats] = useState(INITIAL_THREAT_FEED);
  const [currentTourStep, setCurrentTourStep] = useState<number | null>(null);

  const triggerRateAbuseSimulation = () => {
    toast.info("Simulating rapid request abuse. Initiating 110 requests...");
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 100) {
        clearInterval(interval);
        toast.error("API Gateway Lockout: HTTP 429 Too Many Requests. Client IP banned for 60s.");
      }
    }, 10);
  };

  const injectCustomThreat = () => {
    const travelThreat = {
      time: "Just now",
      type: "IMPOSSIBLE_TRAVEL",
      message: "Security Flag: sequential logins in Berlin and Seoul within 12 seconds. Travel speed > 4000 km/h.",
      ip: "95.111.42.10 -> 210.12.80.32",
      severity: "critical"
    };
    setThreats(prev => [travelThreat, ...prev].slice(0, 6));
    toast.warning("High-Priority Travel Anomaly Alert injected into SOC stream!");
  };

  const downloadComplianceReport = () => {
    const reportData = {
      organization: "Enterprise Workspace A",
      audit_timestamp: new Date().toISOString(),
      standards: [
        { name: "GDPR Article 32 Check", status: "COMPLIANT", details: "AES-256 database column encryption enabled for all PII data." },
        { name: "HIPAA Data Isolation Check", status: "COMPLIANT", details: "ContextVar-based organization row isolation active." },
        { name: "MIME Extension Check", status: "COMPLIANT", details: "Magic binary validation on files enabled." },
        { name: "Malware Isolation Check", status: "COMPLIANT", details: "Quarantine directory auto-provision active." }
      ],
      compliance_rating: "98%"
    };
    
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "privacyshield_compliance_audit.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Compliance audit report exported successfully!");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const randomTemplate = MOCK_THREAT_TEMPLATES[Math.floor(Math.random() * MOCK_THREAT_TEMPLATES.length)];
      const newThreat = {
        ...randomTemplate,
        time: "Just now",
      };
      setThreats(prev => {
        const updatedPrev = prev.map((t) => {
          if (t.time === "Just now") return { ...t, time: "1m ago" };
          if (t.time === "1m ago") return { ...t, time: "5m ago" };
          if (t.time === "5m ago") return { ...t, time: "10m ago" };
          if (t.time === "10m ago") return { ...t, time: "24m ago" };
          if (t.time === "24m ago") return { ...t, time: "1h ago" };
          if (t.time === "1h ago") return { ...t, time: "3h ago" };
          if (t.time === "3h ago") return { ...t, time: "5h ago" };
          return { ...t, time: "Older" };
        });
        return [newThreat, ...updatedPrev].slice(0, 6);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Also reset threats as a refresh action
      setThreats(INITIAL_THREAT_FEED);
    }, 800);
  };

  return (
    <div className="space-y-8 p-6 text-slate-100 min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">SOC Security Center</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">PrivacyShield Operations</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time SaaS multitenant threat intelligence and PII scanning metrics.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleRefresh} 
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync SOC</span>
          </Button>
          <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-400">
            SECURE PORT: 8443
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
                +12.5%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-white">2,847</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Processed Documents</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg hover:border-teal-500/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                <Shield className="w-5 h-5 text-teal-400" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
                +8.2%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-white">18,942</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Sensitive Items Found</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg hover:border-amber-500/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-950/40 text-cyan-400 border border-cyan-800/30">
                +3.1%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-white">1,428</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Vault Quarantine Files</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg hover:border-red-500/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-950/40 text-red-400 border border-red-800/30 animate-pulse">
                High Risk
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-white">1</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Active Travel Anomalies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <Card className="lg:col-span-2 bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center space-x-2 text-white">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>Ingested Data & Violations Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
                    itemStyle={{ color: '#06b6d4' }}
                  />
                  <Area type="monotone" dataKey="safe" name="Clean Documents" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSafe)" />
                  <Area type="monotone" dataKey="violations" name="Violations Scanned" stroke="#ef4444" fillOpacity={1} fill="url(#colorViolations)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PII Breakdown */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center space-x-2 text-white">
              <Cpu className="w-5 h-5 text-teal-400" />
              <span>PII Detection Vectors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {piiBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{item.type}</span>
                    <div className="space-x-3 text-right">
                      <span className="text-white font-bold">{item.count}</span>
                      <span className="text-cyan-400">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/40">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 - Threat Stream & AI Insight Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOC Live Threat Stream */}
        <Card className="lg:col-span-2 bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center space-x-2 text-white">
              <Terminal className="w-5 h-5 text-rose-400 animate-pulse" />
              <span>Live SOC Security Stream</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 px-4">
            <div className="space-y-4">
              {threats.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start space-x-3 p-3.5 rounded-lg border transition-all duration-300 ${
                    item.severity === 'critical' 
                      ? 'bg-red-950/20 border-red-900/50 shadow-md shadow-red-900/5' 
                      : item.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/50'
                      : item.severity === 'success'
                      ? 'bg-emerald-950/20 border-emerald-900/50'
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    item.severity === 'critical' ? 'bg-red-500 animate-ping' :
                    item.severity === 'warning' ? 'bg-amber-500' :
                    item.severity === 'success' ? 'bg-emerald-500' : 'bg-cyan-500'
                  }`}></span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{item.type}</span>
                      <span className="text-slate-500">{item.time}</span>
                    </div>
                    <p className="text-sm text-slate-300">{item.message}</p>
                    <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-500">
                      <Globe className="w-3 h-3" />
                      <span>Originating Node: {item.ip}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Calibration Insights */}
        <Card className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center space-x-2 text-white">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>AI Insight Calibration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Calibration Engine</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Calibration Loop analyzed **4 resolved false positives** during this cycle, reducing Aadhaar card pattern threshold to **0.72**. Expected validation accuracy increased by **1.4%**.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-3">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Security Warning</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                IP geolocations detected a **High Risk Session** travel anomaly. An active audit block has been injected to logs.
              </p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-semibold">
                <span>Free Tier Scanned Quota Usage</span>
                <span>2.4%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800/40">
                <div className="w-[2.4%] h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"></div>
              </div>
              <span className="text-[10px] text-slate-500 mt-2 block font-mono">1.2 MB / 50.0 MB quota consumed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4 - Investor Showcase Control Center */}
      <Card className="bg-slate-950/50 backdrop-blur-2xl border border-cyan-500/30 shadow-xl shadow-cyan-950/5">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <CardTitle className="text-lg font-bold flex items-center space-x-2 text-cyan-400">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>INVESTOR DEMO & PENTEST SIMULATION CENTER</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Action 1: Tour */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Guided Walkthrough</h4>
              <p className="text-xs text-slate-400">Execute an interactive UI walkthrough highlighting SOC metrics, detection vectors, and compliance nodes.</p>
              <Button 
                onClick={() => setCurrentTourStep(0)} 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2"
              >
                Start Guided Tour
              </Button>
            </div>

            {/* Action 2: Rate Limit Abuse */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Simulate API Abuse</h4>
              <p className="text-xs text-slate-400">Triggers 100 rapid HTTP calls to /health/liveness, simulating rate-limit protection lockouts.</p>
              <Button 
                onClick={triggerRateAbuseSimulation} 
                className="w-full bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs py-2"
              >
                Trigger Rate Abuse
              </Button>
            </div>

            {/* Action 3: Threat Injection */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Inject Threat Log</h4>
              <p className="text-xs text-slate-400">Inject an immediate high-severity connection travel anomaly into the live telemetry feed stream.</p>
              <Button 
                onClick={injectCustomThreat} 
                className="w-full bg-amber-700 hover:bg-amber-600 text-white font-semibold text-xs py-2"
              >
                Inject Travel Anomaly
              </Button>
            </div>

            {/* Action 4: Compliance Report */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Compliance Report</h4>
              <p className="text-xs text-slate-400">Auto-generate and export a sample JSON document detailing GDPR/HIPAA compliance audit checklists.</p>
              <Button 
                onClick={downloadComplianceReport} 
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs py-2"
              >
                Export Audit Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stepper Tour Overlay */}
      {currentTourStep !== null && (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-950 border-2 border-cyan-500 rounded-xl shadow-2xl p-5 z-50 animate-bounce-short">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
              Demo Tour: Step {currentTourStep + 1} of {TOUR_STEPS.length}
            </span>
            <button 
              onClick={() => setCurrentTourStep(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <h4 className="text-sm font-bold text-white mt-2 uppercase tracking-wide">
            {TOUR_STEPS[currentTourStep].title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {TOUR_STEPS[currentTourStep].desc}
          </p>
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentTourStep(prev => prev !== null && prev > 0 ? prev - 1 : null)}
              disabled={currentTourStep === 0}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-1 h-auto"
            >
              Back
            </Button>
            <div className="space-x-2">
              <Button
                onClick={() => setCurrentTourStep(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-1 h-auto"
              >
                Skip
              </Button>
              <Button
                onClick={() => {
                  if (currentTourStep < TOUR_STEPS.length - 1) {
                    setCurrentTourStep(prev => prev !== null ? prev + 1 : null);
                  } else {
                    setCurrentTourStep(null);
                    toast.success("Thank you for taking the walkthrough tour!");
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] px-2 py-1 h-auto"
              >
                {currentTourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
