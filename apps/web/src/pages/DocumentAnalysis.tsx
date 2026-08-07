import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnalysisService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { DualPDFViewer } from '../components/DualPDFViewer';
import { Shield, ArrowLeft, Loader2, FileText, CheckCircle2, AlertTriangle, Download, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';

type Entity = {
  id: number;
  entity_type: string;
  text: string;
  confidence: number;
  is_redacted: boolean;
};

export function DocumentAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<any>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
  const [redacting, setRedacting] = useState(false);
  const [redactedPath, setRedactedPath] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadAnalysis = async (docId: string) => {
    try {
      const response = await AnalysisService.getAnalysis(docId);
      setDocData(response.data.document);
      setEntities(response.data.entities);
      
      const toSelect = new Set<number>();
      response.data.entities.forEach((e: Entity) => {
        if (!e.is_redacted && e.confidence > 0.6) {
          toSelect.add(e.id);
        }
      });
      setSelectedEntities(toSelect);
      
      if (response.data.document.redacted_storage_path) {
        setRedactedPath(response.data.document.redacted_storage_path);
      }
    } catch {
      toast.error('Failed to load analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAnalysis(id);
    }
  }, [id]);

  const handleToggleEntity = (entityId: number) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedEntities(newSelected);
  };

  const handleApplyRedactions = async (): Promise<string | null> => {
    if (!id) return null;
    let targetEntityIds = Array.from(selectedEntities);
    if (targetEntityIds.length === 0) {
      targetEntityIds = entities.filter(e => !e.is_redacted).map(e => e.id);
    }
    if (targetEntityIds.length === 0) {
      toast.error('No entities available to redact.');
      return null;
    }
    setRedacting(true);
    try {
      const response = await AnalysisService.redactDocument(id, targetEntityIds);
      const newPath = response.data.redacted_path;
      setRedactedPath(newPath);
      toast.success('Document secured successfully!');
      await loadAnalysis(id);
      return newPath;
    } catch {
      toast.error('Failed to apply redactions. Please try again.');
      return null;
    } finally {
      setRedacting(false);
    }
  };

  const handleExportAudit = () => {
    toast.info('Downloading audit report...');
    window.open(AnalysisService.getAuditReportUrl(id as string), '_blank');
  };

  const handleDownloadRedacted = async () => {
    if (!id) return;
    let path = redactedPath;
    if (!path) {
      toast.info('Securing document and applying redactions...');
      path = await handleApplyRedactions();
    }
    if (path || redactedPath) {
      toast.success('Downloading secured PDF...');
      window.open(AnalysisService.getDownloadUrl(id as string), '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading analysis results...</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Analysis Not Found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/queue')}>Return to Queue</Button>
      </div>
    );
  }

  const entitiesByType = entities.reduce((acc, entity) => {
    if (!acc[entity.entity_type]) acc[entity.entity_type] = [];
    acc[entity.entity_type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  const redactedCount = entities.filter(e => e.is_redacted).length;
  const avgConfidence = entities.length > 0 
    ? (entities.reduce((acc, e) => acc + e.confidence, 0) / entities.length) * 100 
    : 100;

  const originalUrl = AnalysisService.getPreviewUrl(id as string);
  const secureUrl = redactedPath ? AnalysisService.getDownloadUrl(id as string) : null;

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/queue')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Analysis Workbench</h1>
              {redactedPath ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> SECURED
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> AT RISK
                </span>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <FileText className="h-4 w-4" /> {docData.original_name}
            </p>
          </div>
        </div>
        
        {/* Export Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportAudit} title="Export CSV Audit Report">
            <FileBarChart className="mr-2 h-4 w-4" /> Audit Log
          </Button>
          <Button
            variant="default"
            className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-medium shadow-sm"
            size="sm"
            disabled={redacting}
            onClick={handleDownloadRedacted}
          >
            {redacting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing PDF...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> {redactedPath ? 'Download Redacted PDF' : 'Secure & Download PDF'}</>
            )}
          </Button>
        </div>
      </div>


      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{entities.length}</p>
              <p className="text-sm text-muted-foreground font-medium">Entities Detected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{redactedCount}</p>
              <p className="text-sm text-muted-foreground font-medium">Entities Redacted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground font-medium">Avg Confidence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`grid grid-cols-1 ${sidebarOpen ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-8 h-[calc(100vh-280px)] min-h-[600px]`}>
        
        {/* Left Panel: Entity Control List (Collapsible) */}
        {sidebarOpen && (
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden bg-card rounded-xl border shadow-sm transition-all duration-300 ease-in-out relative">
            <CardHeader className="bg-muted/30 border-b py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Review PII</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} title="Collapse Sidebar" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left-close w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
            {Object.keys(entitiesByType).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p>No PII detected.</p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.entries(entitiesByType).map(([type, typeEntities]) => (
                  <div key={type} className="p-4">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                      {type.replace('IN_', '').replace('_', ' ')} ({typeEntities.length})
                    </h3>
                    <div className="space-y-3">
                      {typeEntities.map((entity) => (
                        <div 
                          key={entity.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                            entity.is_redacted 
                              ? 'bg-muted/50 border-transparent opacity-60' 
                              : selectedEntities.has(entity.id)
                                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-border hover:border-blue-200'
                          }`}
                        >
                          <div 
                            className="mt-1 cursor-pointer" 
                            onClick={() => !entity.is_redacted && handleToggleEntity(entity.id)}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${entity.is_redacted || selectedEntities.has(entity.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                                {(entity.is_redacted || selectedEntities.has(entity.id)) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-sm font-medium leading-none break-all" title={entity.text}>
                              {entity.text}
                            </label>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full ${
                                entity.confidence > 0.8 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {Math.round(entity.confidence * 100)}% Confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t bg-muted/20">
            <Button 
              className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
              disabled={selectedEntities.size === 0 || redacting}
              onClick={handleApplyRedactions}
            >
              {redacting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing...</>
              ) : (
                <><Shield className="mr-2 h-4 w-4" /> Apply Redactions</>
              )}
            </Button>
          </div>
        </div>
        )}

        {/* Right Panel: Dual Document Viewer */}
        <div className={`${sidebarOpen ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col relative h-full transition-all duration-300 ease-in-out`}>
          {!sidebarOpen && (
            <div className="absolute top-4 left-4 z-50">
              <Button variant="secondary" size="icon" onClick={() => setSidebarOpen(true)} className="shadow-md bg-white hover:bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left-open w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
              </Button>
            </div>
          )}
          {redacting && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
              <div className="bg-card p-6 rounded-xl shadow-xl border flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-bold">Applying Redactions</h3>
                <p className="text-sm text-muted-foreground mt-1">Generating secure PDF...</p>
              </div>
            </div>
          )}
          
          <DualPDFViewer 
            originalUrl={originalUrl} 
            redactedUrl={secureUrl} 
          />
        </div>
      </div>
    </div>
  );
}
