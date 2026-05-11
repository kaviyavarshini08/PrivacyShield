import { FileText, Shield, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const trendData = [
  { name: 'Mon', documents: 120, redactions: 80 },
  { name: 'Tue', documents: 132, redactions: 90 },
  { name: 'Wed', documents: 101, redactions: 70 },
  { name: 'Thu', documents: 134, redactions: 100 },
  { name: 'Fri', documents: 90, redactions: 60 },
  { name: 'Sat', documents: 40, redactions: 20 },
  { name: 'Sun', documents: 30, redactions: 15 },
];

const piiBreakdown = [
  { type: 'Aadhaar', count: 342, percentage: 19.0, color: '#1E3A8A' },
  { type: 'PAN', count: 287, percentage: 15.9, color: '#0F766E' },
  { type: 'Phone', count: 456, percentage: 25.3, color: '#F59E0B' },
  { type: 'Email', count: 521, percentage: 28.9, color: '#10B981' },
  { type: 'Address', count: 198, percentage: 11.0, color: '#EF4444' },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-lg">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <Card className="rounded-xl shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#1E3A8A]" />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                +12.5%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold">2,847</h3>
              <p className="text-sm text-muted-foreground mt-1">Documents Processed</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="rounded-xl shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-[#0F766E]/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#0F766E]" />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                +8.2%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold">18,942</h3>
              <p className="text-sm text-muted-foreground mt-1">PII Items Detected</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="rounded-xl shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                +3.1%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold">1,428</h3>
              <p className="text-sm text-muted-foreground mt-1">Files in Vault</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="rounded-xl shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                3 New
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold">12</h3>
              <p className="text-sm text-muted-foreground mt-1">Compliance Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm rounded-xl border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Document Processing Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="documents" name="Documents" stackId="a" fill="#1E3A8A" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="redactions" name="Redactions" stackId="a" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PII Breakdown */}
        <Card className="shadow-sm rounded-xl border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">PII Detection Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mt-2">
              {piiBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="font-medium text-foreground">{item.type}</span>
                    </div>
                    <div className="flex space-x-4">
                      <span className="font-semibold">{item.count}</span>
                      <span className="text-muted-foreground w-10 text-right">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
