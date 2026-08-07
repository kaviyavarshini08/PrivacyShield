import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ZoomIn, ZoomOut, Maximize, FileText, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker with unpkg CDN fallback
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DualPDFViewerProps {
  originalUrl: string;
  redactedUrl?: string | null;
}

interface LoadedDoc {
  blobUrl: string;
  type: 'pdf' | 'image' | 'text';
  textContent?: string;
}

export function DualPDFViewer({
  originalUrl,
  redactedUrl,
}: DualPDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);

  const [originalDoc, setOriginalDoc] = useState<LoadedDoc | null>(null);
  const [redactedDoc, setRedactedDoc] = useState<LoadedDoc | null>(null);

  const [origLoading, setOrigLoading] = useState(true);
  const [redLoading, setRedLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState(false);

  useEffect(() => {
    const fetchDoc = async (
      url: string,
      setter: (doc: LoadedDoc) => void,
      setLoading: (l: boolean) => void
    ) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const token = localStorage.getItem('privacy_shield_token') || localStorage.getItem('token');
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (contentType.includes('image') || url.match(/\.(png|jpg|jpeg|webp)$/i)) {
          setter({ blobUrl, type: 'image' });
        } else if (contentType.includes('text') || url.match(/\.(txt|csv|log|json)$/i)) {
          const textContent = await blob.text();
          setter({ blobUrl, type: 'text', textContent });
        } else {
          setter({ blobUrl, type: 'pdf' });
        }
      } catch (error: any) {
        console.error("DOCUMENT LOAD ERROR:", error);
        setErrorMsg(error.message || 'Failed to load document preview');
      } finally {
        setLoading(false);
      }
    };

    if (originalUrl) {
      fetchDoc(originalUrl, setOriginalDoc, setOrigLoading);
    }

    if (redactedUrl) {
      fetchDoc(redactedUrl, setRedactedDoc, setRedLoading);
    }
  }, [originalUrl, redactedUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.0);

  const pages = Array.from(new Array(numPages || 1), (_, index) => index + 1);

  const renderContent = (doc: LoadedDoc | null, isLoading: boolean, label: string) => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
          <p className="text-sm text-slate-400 font-medium animate-pulse">Loading {label} Preview...</p>
        </div>
      );
    }

    if (!doc) {
      return (
        <div className="flex flex-col items-center justify-center p-20 min-h-[400px] text-slate-400">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="text-sm font-medium">{errorMsg || "Document preview unavailable"}</p>
        </div>
      );
    }

    if (doc.type === 'image') {
      return (
        <div className="p-4 flex items-center justify-center min-h-[400px]">
          <img
            src={doc.blobUrl}
            alt={label}
            className="max-w-full max-h-[70vh] rounded shadow-md object-contain border border-slate-700"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          />
        </div>
      );
    }

    if (doc.type === 'text') {
      return (
        <div className="p-6 bg-slate-950 text-emerald-400 font-mono text-sm rounded-lg overflow-auto max-h-[70vh] border border-slate-800 shadow-inner min-w-[360px]">
          <pre className="whitespace-pre-wrap break-words">{doc.textContent}</pre>
        </div>
      );
    }

    if (pdfRenderError) {
      return (
        <div className="w-full h-[65vh] min-w-[450px] rounded-lg overflow-hidden border border-slate-800 shadow-inner">
          <iframe
            src={doc.blobUrl}
            title={label}
            className="w-full h-full border-none rounded-lg"
          />
        </div>
      );
    }

    return (
      <Document
        file={doc.blobUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(err) => {
          console.warn("PDF.js render fallback, switching to iframe viewer:", err);
          setPdfRenderError(true);
        }}
        loading={
          <div className="flex justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }
      >
        {pages.map((pageNumber) => (
          <div key={`page_${pageNumber}`} className="mb-4 shadow-sm border rounded overflow-hidden">
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    );
  };


  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Toolbar */}
      <div className="h-14 bg-card border-b flex items-center justify-between px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Original Document
          </div>

          {redactedDoc && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Secured Output
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={scale >= 3.0}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2"></div>

          <Button variant="outline" size="icon" onClick={handleResetZoom}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* VIEWER CANVAS */}
      <div className="flex-1 overflow-auto bg-slate-900/90 p-6">
        <div className="flex justify-center gap-8 min-w-max">
          {/* ORIGINAL PANEL */}
          <div className="bg-slate-950 border border-slate-800 shadow-xl rounded-xl p-4 flex flex-col items-center">
            {renderContent(originalDoc, origLoading, 'Original')}
          </div>

          {/* SECURED REDACTED PANEL */}
          {redactedDoc && (
            <div className="bg-slate-950 border border-emerald-900/50 ring-2 ring-emerald-500/20 shadow-xl rounded-xl p-4 flex flex-col items-center relative">
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Secured Output
                </div>
              </div>
              {renderContent(redactedDoc, redLoading, 'Secured Redaction')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}