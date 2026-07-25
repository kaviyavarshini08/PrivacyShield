import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, BookOpen, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChatService } from '../services/api';
import { toast } from 'sonner';

type Message = {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  timestamp: string;
};

export function Investigation() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'SYSTEM INITIALIZED: PrivacyShield RAG Cognitive Engine online. You can query the entire organization database or ask for compliance assistance under GDPR, HIPAA, and DPDP.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'rag' | 'compliance'>('rag');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      let response;
      if (mode === 'rag') {
        response = await ChatService.investigate(userText);
      } else {
        response = await ChatService.ask(userText);
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: response.data.response,
        sources: response.data.sources || [],
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error('RAG request failed. Ensure backend service is reachable.');
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'ERROR: Connection to cognitive pipeline failed. Review system logs.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 text-slate-100 min-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">AI Cognitive Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Investigation Space</h1>
          <p className="text-slate-400 text-xs mt-0.5">Semantic search and document intelligence mapping.</p>
        </div>
        <div className="flex space-x-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
          <Button
            size="sm"
            variant={mode === 'rag' ? 'default' : 'ghost'}
            className={mode === 'rag' ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400'}
            onClick={() => setMode('rag')}
          >
            Workspace RAG Search
          </Button>
          <Button
            size="sm"
            variant={mode === 'compliance' ? 'default' : 'ghost'}
            className={mode === 'compliance' ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400'}
            onClick={() => setMode('compliance')}
          >
            Compliance Helper
          </Button>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col bg-slate-950/40 backdrop-blur-md rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col space-y-1.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div 
                  className={`p-3.5 rounded-lg border text-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-100' 
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* Citations / Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Referenced Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.sources.map((src, sIdx) => (
                          <span 
                            key={sIdx} 
                            className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-600 font-mono px-1">{msg.timestamp}</span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-500 mr-auto p-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs font-mono">Running pgvector index scans...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'rag' ? "Ask about data, leaks, or documents in workspace..." : "Ask compliance details (GDPR, HIPAA, etc.)..."}
              className="flex-1 bg-slate-900/80 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-cyan-500"
            />
            <Button type="submit" disabled={isLoading} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-4">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Sidebar Info/Status */}
        <div className="space-y-6">
          <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Console State</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>VECTOR DISTANCE:</span>
                  <span className="text-cyan-400 font-bold">COSINE (&lt;=&gt;)</span>
                </div>
                <div className="flex justify-between">
                  <span>MAX NAMESPACE CHUNKS:</span>
                  <span className="text-white">5</span>
                </div>
                <div className="flex justify-between">
                  <span>EMBEDDING MODEL:</span>
                  <span className="text-teal-400">all-MiniLM-L6-v2</span>
                </div>
                <div className="flex justify-between">
                  <span>TENANT CONTEXT:</span>
                  <span className="text-emerald-400 font-bold">ENFORCED</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Scope Isolation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-slate-400 leading-relaxed space-y-2">
              <p>
                RAG queries automatically query only chunks that belong to your organization workspace.
              </p>
              <p>
                Cross-tenant references are strictly pruned at the database query boundary.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
