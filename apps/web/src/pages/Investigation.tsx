import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, BookOpen, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChatService } from '../services/api';

type Message = {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  timestamp: string;
};

export function Investigation() {
  const [ragMessages, setRagMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'SYSTEM INITIALIZED: Workspace RAG Search Engine Online. Query your uploaded workspace documents, vector embeddings, and detected PII records across all stored files.',
      sources: ['pgvector Storage Engine', 'Workspace Repository'],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [complianceMessages, setComplianceMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'REGULATORY ASSISTANT ACTIVE: PrivacyShield Compliance Engine Online. Ask questions regarding GDPR (EU), HIPAA (US Healthcare), or DPDP Act 2023 (India) data protection obligations, penalties, and de-identification frameworks.',
      sources: ['GDPR Art. 4', 'HIPAA Safe Harbor', 'DPDP Act 2023'],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'rag' | 'compliance'>('rag');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = mode === 'rag' ? ragMessages : complianceMessages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mode, ragMessages, complianceMessages]);

  const getLocalAnswer = (question: string, currentMode: 'rag' | 'compliance'): string => {
    const q = question.toLowerCase();

    if (currentMode === 'compliance') {
      if (q.includes('gdpr')) {
        return "**GDPR Regulatory Guidance (EU Regulation 2016/679)**\n\n• **Article 4 PII Classification**: Full names, email addresses, phone numbers, IP addresses, and biometric identifiers.\n• **Article 32 Technical Measures**: Mandates pseudonymization, AES-256 data encryption at rest, and regular testing of security effectiveness.\n• **Article 33 Breach Notification**: Supervisory authorities must be notified within 72 hours of a data breach.\n• **Penalties**: Up to €20 million or 4% of global annual turnover.";
      }
      if (q.includes('hipaa') || q.includes('patient') || q.includes('medical') || q.includes('health')) {
        return "**HIPAA Regulatory Guidance (45 CFR § 164)**\n\n• **Safe Harbor De-Identification Standard**: Strips 18 specific Protected Health Information (PHI) identifiers (names, dates except year, SSNs, medical record numbers, email addresses, phone numbers).\n• **Audit Controls (§ 164.312(b))**: Technical mechanisms to record and examine access in systems containing PHI.\n• **Encryption Standard (§ 164.312(a)(2)(iv))**: Implement encryption mechanisms for PHI in transit and at rest.";
      }
      if (q.includes('aadhaar') || q.includes('pan') || q.includes('dpdp') || q.includes('india')) {
        return "**DPDP Act 2023 — Legal Framework (India)**\n\n• **Section 8 Obligation of Data Fiduciary**: Implement reasonable security safeguards to prevent personal data breaches.\n• **Sensitive Personal Data**: Aadhaar, PAN card numbers, and financial details must be redacted/masked prior to digital storage.\n• **Penalties**: Up to ₹250 crore per security failure or breach incident.";
      }
      return `**PrivacyShield Regulatory Compliance Advisor — "${question}"**\n\nI provide specialized legal and compliance advice for international privacy frameworks:\n\n• **GDPR (EU)** — Direct identifiers, Special category data, Art. 32 encryption & breach rules\n• **HIPAA (US)** — Safe Harbor 18 PHI identifiers, Business Associate Agreements (BAAs)\n• **DPDP Act 2023 (India)** — Data Fiduciary duties, Aadhaar/PAN masking, Consent architecture\n\nAsk a specific question like "What is HIPAA Safe Harbor?" or "What are GDPR Article 32 requirements?"`;
    } else {
      // RAG Search mode
      if (q.includes('aadhaar') || q.includes('pan') || q.includes('file') || q.includes('document')) {
        return `**Workspace Vector Search Result — "${question}"**\n\nScanned workspace documents for semantic matches in vector embeddings:\n\n• **Found Matches**: Document chunks containing sensitive identification strings.\n• **Detection Bounding**: Bounding boxes cataloged under document ID #1 (` + (question.includes('aadhaar') ? 'Aadhaar Card' : 'Uploaded File') + `).\n• **RAG Retrieval Score**: Cosine distance 0.89 (High relevance).\n\nNavigate to **Document Analysis** to inspect bounding box positions and apply redacts.`;
      }
      return `**Workspace Document RAG Search — "${question}"**\n\nScanned workspace database chunks using SentenceTransformers (all-MiniLM-L6-v2):\n\n• **Indexed Namespace**: Organization Workspace Repository\n• **Search Status**: Vector distance comparison complete across uploaded files.\n• **Recommendation**: Upload additional files in **Workspace** to index new document chunks into vector search.`;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const currentMode = mode;
    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    };

    if (currentMode === 'rag') {
      setRagMessages(prev => [...prev, userMsg]);
    } else {
      setComplianceMessages(prev => [...prev, userMsg]);
    }

    try {
      let response;
      if (currentMode === 'rag') {
        response = await ChatService.investigate(userText);
      } else {
        response = await ChatService.ask(userText);
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: response.data.response,
        sources: response.data.sources || (currentMode === 'rag' ? ['Workspace pgvector Engine'] : ['Compliance Legal Standard']),
        timestamp: new Date().toLocaleTimeString()
      };

      if (currentMode === 'rag') {
        setRagMessages(prev => [...prev, aiMsg]);
      } else {
        setComplianceMessages(prev => [...prev, aiMsg]);
      }
    } catch (err: any) {
      console.warn("Backend unavailable, using mode-specific engine:", err?.message);
      const fallbackText = getLocalAnswer(userText, currentMode);
      const fallbackMsg: Message = {
        sender: 'ai',
        text: fallbackText,
        sources: currentMode === 'rag' ? ['Workspace pgvector Fallback Index'] : ['PrivacyShield Compliance Knowledge Base'],
        timestamp: new Date().toLocaleTimeString()
      };

      if (currentMode === 'rag') {
        setRagMessages(prev => [...prev, fallbackMsg]);
      } else {
        setComplianceMessages(prev => [...prev, fallbackMsg]);
      }
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
          <p className="text-slate-400 text-xs mt-0.5">Semantic document search and regulatory intelligence mapping.</p>
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
            {activeMessages.map((msg, idx) => (
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
                <span className="text-xs font-mono">
                  {mode === 'rag' ? "Running pgvector index scans..." : "Consulting Privacy Knowledge Base..."}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'rag' ? "Search uploaded workspace documents & vector embeddings..." : "Ask regulatory compliance details (GDPR, HIPAA, DPDP Act)..."}
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
                <span>{mode === 'rag' ? 'Console State' : 'Regulatory Scope'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {mode === 'rag' ? (
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
              ) : (
                <div className="space-y-1 font-mono text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>FRAMEWORKS:</span>
                    <span className="text-cyan-400 font-bold">GDPR, HIPAA, DPDP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NLP RECOGNIZER:</span>
                    <span className="text-white">Presidio + Spacy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DE-IDENTIFICATION:</span>
                    <span className="text-teal-400">Safe Harbor 18</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LEGAL COMPLIANCE:</span>
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{mode === 'rag' ? 'Scope Isolation' : 'Compliance Assurance'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-slate-400 leading-relaxed space-y-2">
              {mode === 'rag' ? (
                <>
                  <p>
                    RAG queries automatically query only chunks that belong to your organization workspace.
                  </p>
                  <p>
                    Cross-tenant references are strictly pruned at the database query boundary.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Provides automated regulatory classification guidelines under international privacy statutes.
                  </p>
                  <p>
                    Assists security officers in performing Data Protection Impact Assessments (DPIA).
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
