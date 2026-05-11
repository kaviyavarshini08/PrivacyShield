import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const piiTrendData = [
  { name: 'Jan', aadhaar: 400, pan: 240, phone: 600 },
  { name: 'Feb', aadhaar: 300, pan: 139, phone: 500 },
  { name: 'Mar', aadhaar: 200, pan: 980, phone: 400 },
  { name: 'Apr', aadhaar: 278, pan: 390, phone: 700 },
  { name: 'May', aadhaar: 189, pan: 480, phone: 300 },
];

const redactionEfficiency = [
  { name: 'Success', value: 98.5, color: '#10B981' },
  { name: 'Failed', value: 1.2, color: '#EF4444' },
  { name: 'False Positive', value: 0.3, color: '#F59E0B' },
];

const storageGrowth = [
  { name: 'Week 1', gb: 12 },
  { name: 'Week 2', gb: 18 },
  { name: 'Week 3', gb: 25 },
  { name: 'Week 4', gb: 32 },
];

const departmentData = [
  { name: 'HR', uploads: 450, score: 98 },
  { name: 'Finance', uploads: 850, score: 99 },
  { name: 'Legal', uploads: 320, score: 100 },
  { name: 'Marketing', uploads: 120, score: 92 },
];

export function Analytics() {
  const [activeTab, setActiveTab] = useState('pii');

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Hub</h1>
        <p className="text-muted-foreground mt-1">Deep dive into detection, redaction, and usage metrics.</p>
      </div>

      <Tabs>
        <TabsList className="mb-6">
          <TabsTrigger active={activeTab === 'pii'} onClick={() => setActiveTab('pii')}>PII Detection</TabsTrigger>
          <TabsTrigger active={activeTab === 'redaction'} onClick={() => setActiveTab('redaction')}>Redaction Metrics</TabsTrigger>
          <TabsTrigger active={activeTab === 'storage'} onClick={() => setActiveTab('storage')}>Storage Usage</TabsTrigger>
          <TabsTrigger active={activeTab === 'dept'} onClick={() => setActiveTab('dept')}>Department Usage</TabsTrigger>
        </TabsList>

        <TabsContent active={activeTab === 'pii'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Detection Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={piiTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="aadhaar" stroke="#1E3A8A" strokeWidth={3} />
                    <Line type="monotone" dataKey="pan" stroke="#0F766E" strokeWidth={3} />
                    <Line type="monotone" dataKey="phone" stroke="#06B6D4" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card className="shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle>Average Confidence Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold text-emerald-500">99.4%</div>
                  <p className="text-muted-foreground mt-2">AI detection accuracy across all document types.</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl bg-[#1E3A8A] text-white">
                <CardHeader>
                  <CardTitle className="text-white/90">Top Detected Entity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">Phone Numbers</div>
                  <p className="text-white/70 mt-2">Accounts for 42% of all redacted items this month.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent active={activeTab === 'redaction'}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-sm rounded-xl lg:col-span-1">
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={redactionEfficiency} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {redactionEfficiency.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm rounded-xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Processing Efficiency (ms/page)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={piiTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
                    <Area type="monotone" dataKey="pan" stroke="#0F766E" fill="#0F766E" fillOpacity={0.2} name="Latency" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent active={activeTab === 'storage'}>
           <Card className="shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Vault Storage Growth</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" unit="GB" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="gb" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="Storage Used" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent active={activeTab === 'dept'}>
           <Card className="shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Department Activity & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis dataKey="name" type="category" stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="uploads" fill="#0F766E" name="Total Uploads" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="score" fill="#06B6D4" name="Compliance Score" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
