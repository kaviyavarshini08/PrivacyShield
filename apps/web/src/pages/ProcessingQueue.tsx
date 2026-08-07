import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Clock, AlertCircle, Eye } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { DocumentService } from '../services/api';

type QueueItem = {
  id: string;
  name: string;
  status: string;
  pii: number | null;
  uploader: string;
  time: string;
};

export function ProcessingQueue() {
  const navigate = useNavigate();
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const response = await DocumentService.getQueue();
      const rawItems = Array.isArray(response.data) ? response.data : [];
      const mappedData = rawItems.map((item: any) => {
        let status = 'Queued';
        if (item.status) {
          status = item.status.charAt(0).toUpperCase() + item.status.slice(1);
        }
        
        let timeStr = '';
        if (item.queued_at) {
          const date = new Date(item.queued_at);
          timeStr = date.toLocaleString();
        } else {
          timeStr = new Date().toLocaleString();
        }

        return {
          id: String(item.document?.id || item.document_id || item.id),
          name: item.document?.original_name || 'Unnamed Document',
          status: status,
          pii: item.pii_found_count !== undefined && item.pii_found_count !== null ? item.pii_found_count : null,
          uploader: item.document?.owner_id ? `User #${item.document.owner_id}` : 'System',
          time: timeStr
        };
      });
      setQueueData(mappedData);
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    completed: queueData.filter(i => i.status === 'Completed').length,
    processing: queueData.filter(i => i.status === 'Processing').length,
    queued: queueData.filter(i => i.status === 'Queued').length,
    failed: queueData.filter(i => i.status === 'Failed').length,
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Processing Queue</h1>
        <p className="text-muted-foreground mt-1">Track document processing status and results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm rounded-xl border-emerald-100 dark:border-emerald-900/50">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-800">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-blue-100 dark:border-blue-900/50">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-sm font-medium text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
              <Clock className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.queued}</p>
              <p className="text-sm font-medium text-muted-foreground">In Queue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-rose-100 dark:border-rose-900/50">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center flex-shrink-0 border border-rose-100 dark:border-rose-800">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">PII Found</th>
                <th className="px-6 py-4 font-medium">Uploaded By</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && queueData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading queue data...
                  </td>
                </tr>
              ) : queueData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No documents in the processing queue.
                  </td>
                </tr>
              ) : (
                queueData.map((item) => (
                  <tr key={item.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center space-x-3">
                        {item.status === 'Completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {item.status === 'Processing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        {item.status === 'Queued' && <Clock className="w-5 h-5 text-slate-400" />}
                        <span className="font-semibold text-foreground truncate max-w-[200px] md:max-w-xs block" title={item.name}>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.status === 'Processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {item.pii !== null ? item.pii : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{item.uploader}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{item.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.status === 'Completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[#1E3A8A] hover:text-[#1E3A8A]/80 hover:bg-[#1E3A8A]/10 font-medium"
                          onClick={() => navigate(`/analysis/${item.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
