import { useState, useEffect, useCallback } from 'react';
import { FileText, ShieldAlert, CheckCircle, Clock, ChevronDown, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { AnalyticsService, DocumentService } from '../services/api';

const COLORS = ['#06B6D4', '#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B'];

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-foreground">{d.name}</p>
        <p className="text-muted-foreground">Count: <span className="font-bold text-foreground">{d.value}</span></p>
      </div>
    );
  }
  return null;
};

export function Analytics() {
  const [data, setData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedDocId, setSelectedDocId] = useState<string>('all');

  const fetchDashboard = useCallback(async () => {
    try {
      const [analyticsRes, queueRes] = await Promise.all([
        AnalyticsService.getDashboard(),
        DocumentService.getQueue().catch(() => ({ data: [] }))
      ]);

      const analyticsData = analyticsRes.data || {};
      const queueList = queueRes.data || [];

      if ((!analyticsData.total_documents || analyticsData.total_documents === 0) && queueList.length > 0) {
        analyticsData.total_documents = queueList.length;
        analyticsData.total_entities_found = analyticsData.total_entities_found ||
          queueList.reduce((acc: number, q: any) => acc + (q.pii_found_count || 0), 0);
        analyticsData.redacted_count = analyticsData.redacted_count ||
          queueList.filter((q: any) => q.status === 'completed').length;
      }

      setData(analyticsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load analytics dashboard data', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // â”€â”€ Document list from per_document_data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const perDocData: any[] = data?.per_document_data || [];
  const isAll = selectedDocId === 'all';
  const selectedDoc = perDocData.find((d: any) => String(d.id) === selectedDocId);

  // â”€â”€ Active entity counts based on selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const activeEntityCounts: Record<string, number> = isAll
    ? (data?.entity_counts || {})
    : (selectedDoc?.entity_counts || {});

  const activeTotalEntities = isAll ? (data?.total_entities_found ?? 0) : (selectedDoc?.pii_count ?? 0);
  const activeTotalDocs = isAll ? (data?.total_documents ?? 0) : 1;
  const activeStorage = isAll
    ? `${data?.total_storage_mb ?? 0}`
    : (selectedDoc ? (selectedDoc.size_kb / 1024).toFixed(2) : '0');
  const activeRedacted = isAll ? (data?.redacted_count ?? 0) : (selectedDoc?.status === 'Redacted' ? 1 : 0);
  const activeAvgConf = data?.avg_confidence > 0 ? `${data.avg_confidence}%` : '0%';

  // Build bar + pie chart data from active entity counts
  const barChartData = Object.entries(activeEntityCounts)
    .map(([type, count]) => ({
      name: type.replace('IN_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      rawName: type,
      count: Number(count)
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const pieData = barChartData.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));
  const topEnt = barChartData.length > 0 ? barChartData[0].name : (data ? 'None detected yet' : 'â€”');

  const statCards = [
    { label: isAll ? 'Total Documents' : 'Selected Doc', value: isAll ? activeTotalDocs : (selectedDoc?.name || 'â€”'), icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'PII Items Found', value: activeTotalEntities, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: isAll ? 'Docs Redacted' : 'Redacted', value: activeRedacted, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Storage Used', value: `${activeStorage} MB`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live metrics from your uploaded documents. Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        {/* Document Selector */}
        {perDocData.length > 0 && (
          <div className="relative min-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            </div>
            <select
              id="doc-selector"
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground shadow-sm hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
            >
              <option value="all">ðŸ“Š All Documents</option>
              {perDocData.map((doc: any) => (
                <option key={doc.id} value={String(doc.id)}>
                  ðŸ“„ {doc.full_name || doc.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Selected document info banner */}
      {!isAll && selectedDoc && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-foreground">{selectedDoc.full_name || selectedDoc.name}</span>
          <span className="text-muted-foreground hidden sm:inline">Â·</span>
          <span className="text-muted-foreground">{selectedDoc.date}</span>
          <span className="text-muted-foreground hidden sm:inline">Â·</span>
          <span className={`font-semibold ${selectedDoc.status === 'Redacted' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {selectedDoc.status}
          </span>
          <span className="text-muted-foreground hidden sm:inline">Â·</span>
          <span className="text-muted-foreground">{selectedDoc.size_kb} KB</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-sm rounded-xl">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg} flex-shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color} truncate`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Overview Table (only in All mode) */}
      {isAll && perDocData.length > 0 && (
        <Card className="shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              Document Overview
              <span className="text-xs font-normal text-muted-foreground ml-1">â€” click a row to drill into that document</span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium text-center">Date</th>
                  <th className="px-4 py-3 font-medium text-center">PII Found</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Size</th>
                  <th className="px-4 py-3 font-medium">Top Entity Types</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perDocData.map((doc: any) => {
                  const topEntries = Object.entries(doc.entity_counts || {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3);
                  return (
                    <tr
                      key={doc.id}
                      className="bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedDocId(String(doc.id))}
                    >
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate" title={doc.full_name}>
                        ðŸ“„ {doc.full_name || doc.name}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{doc.date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-red-500">{doc.pii_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === 'Redacted'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{doc.size_kb} KB</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {topEntries.map(([type, cnt]) => (
                            <span key={type} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                              {type.replace('IN_', '').replace(/_/g, ' ')}
                              <span className="font-bold text-foreground">Ã—{cnt as number}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PII Detection Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Bar Chart */}
        <Card className="shadow-sm rounded-xl lg:col-span-2">
          <CardHeader>
            <CardTitle>
              PII Entity Types Detected
              {!isAll && selectedDoc && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">â€” {selectedDoc.name}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {barChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <ShieldAlert className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No PII data yet</p>
                <p className="text-xs opacity-70">Upload a document to see entity detection results here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
                  <Bar dataKey="count" name="Detected Count" radius={[4, 4, 0, 0]}>
                    {barChartData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="shadow-sm rounded-xl">
            <CardHeader><CardTitle className="text-sm">AI Confidence Score</CardTitle></CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-emerald-500">{activeAvgConf}</div>
              <p className="text-muted-foreground mt-2 text-xs">Average detection accuracy across all documents.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-xl bg-[#1E3A8A] text-white">
            <CardHeader><CardTitle className="text-white/90 text-sm">Top Entity Type</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topEnt}</div>
              <p className="text-white/70 mt-2 text-xs">
                Most frequent PII type in {isAll ? 'your documents' : 'this document'}.
              </p>
            </CardContent>
          </Card>

          {/* Pie chart with color legend */}
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm">Entity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground gap-2">
                  <ShieldAlert className="w-7 h-7 opacity-30" />
                  <p className="text-xs">No data to display</p>
                </div>
              ) : (
                <div>
                  {/* Donut chart */}
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={65}
                          paddingAngle={2}
                        >
                          {pieData.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Color legend â€” entity name + color swatch + count */}
                  <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {pieData.map((entry: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                            style={{ backgroundColor: entry.fill }}
                          />
                          <span className="text-foreground font-medium truncate" title={entry.name}>
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-muted-foreground font-semibold ml-2 flex-shrink-0 tabular-nums">
                          {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

