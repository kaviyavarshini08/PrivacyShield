import { useState, useEffect } from 'react';
import { Check, X, Edit3, Loader2, ShieldCheck, AlertCircle, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ReviewService } from '../services/api';
import { toast } from 'sonner';

type DetectedEntity = {
  id: number;
  document_id: number;
  entity_type: string;
  text: string;
  confidence: number;
  page_number: number;
  attribution: string;
  reason: string;
};

export function ReviewQueue() {
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [correctedType, setCorrectedType] = useState('');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const response = await ReviewService.getQueue();
      setEntities(response.data || []);
    } catch (err: any) {
      toast.error('Failed to load review queue. Verify backend routing.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await ReviewService.approve(id);
      toast.success('PII detection approved.');
      setEntities(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error('Failed to approve detection.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await ReviewService.reject(id);
      toast.warning('Detection rejected. Feedback logged to recalibration database.');
      setEntities(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error('Failed to reject detection.');
    }
  };

  const handleCorrect = async (id: number) => {
    if (!correctedText.trim() || !correctedType.trim()) {
      toast.error('Please enter corrected text and type.');
      return;
    }
    try {
      await ReviewService.correct(id, correctedText, correctedType);
      toast.success('Correction saved successfully.');
      setEditingId(null);
      setEntities(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error('Failed to submit correction.');
    }
  };

  const startEditing = (entity: DetectedEntity) => {
    setEditingId(entity.id);
    setCorrectedText(entity.text);
    setCorrectedType(entity.entity_type);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Human-In-The-Loop</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">AI Feedback Review Queue</h1>
          <p className="text-slate-400 text-xs mt-0.5">Audit and approve AI classifications to recalibrate detection thresholds.</p>
        </div>
        <Button 
          onClick={fetchQueue} 
          disabled={isLoading}
          className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-sm font-mono text-slate-400">Loading pending violations...</span>
        </div>
      ) : entities.length === 0 ? (
        <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Check className="w-12 h-12 text-emerald-400 bg-emerald-500/10 p-2.5 rounded-full border border-emerald-500/20" />
            <div>
              <h3 className="text-lg font-bold text-white">Review Queue Clear</h3>
              <p className="text-slate-400 text-xs mt-1">All scanned document detections have been fully validated by the operations center.</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {entities.map(entity => (
            <Card key={entity.id} className="bg-slate-950/40 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 px-2 py-0.5 rounded">
                      {entity.entity_type}
                    </span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono ${
                      entity.attribution === 'regex' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/30'
                    }`}>
                      {entity.attribution} detection
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Doc ID: #{entity.document_id} (Page {entity.page_number})
                    </span>
                  </div>

                  {editingId === entity.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">CORRECTED TEXT:</label>
                        <Input 
                          value={correctedText} 
                          onChange={e => setCorrectedText(e.target.value)} 
                          className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">CORRECTED TYPE:</label>
                        <Input 
                          value={correctedType} 
                          onChange={e => setCorrectedType(e.target.value)} 
                          className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base font-bold text-white font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800/80 inline-block">
                        {entity.text}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{entity.reason || "Identified as sensitive parameter block."}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Score and Controls */}
                <div className="flex items-center space-x-6">
                  {/* Confidence meter */}
                  <div className="text-center">
                    <span className="text-xs text-slate-400 uppercase tracking-widest block font-bold">Confidence</span>
                    <span className="text-2xl font-black text-cyan-400 mt-1 block">{(entity.confidence * 100).toFixed(0)}%</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 border-l border-slate-800 pl-6">
                    {editingId === entity.id ? (
                      <>
                        <Button 
                          onClick={() => handleCorrect(entity.id)}
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                        >
                          Save
                        </Button>
                        <Button 
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          onClick={() => handleApprove(entity.id)}
                          size="sm"
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 font-bold"
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          onClick={() => handleReject(entity.id)}
                          size="sm"
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-rose-400 font-bold"
                        >
                          <X className="w-4 h-4 mr-1" /> Flag False Positive
                        </Button>
                        <Button 
                          onClick={() => startEditing(entity)}
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
