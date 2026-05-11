import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ZoomIn, ZoomOut, Maximize, FileText } from 'lucide-react';
import { Button } from './ui/button';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface DualPDFViewerProps {
  originalUrl: string;
  redactedUrl?: string | null;
}

export function DualPDFViewer({
  originalUrl,
  redactedUrl,
}: DualPDFViewerProps) {

  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);

  const [originalPdf, setOriginalPdf] = useState<string | null>(null);
  const [redactedPdf, setRedactedPdf] = useState<string | null>(null);

  // Load secured PDFs
  useEffect(() => {

  const fetchPdf = async (
    url: string,
    setter: (url: string) => void
  ) => {

    try {

      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      setter(blobUrl);

    } catch (error) {
      console.error("PDF LOAD ERROR:", error);
    }
  };

  if (originalUrl) {
    fetchPdf(originalUrl, setOriginalPdf);
  }

  if (redactedUrl) {
    fetchPdf(redactedUrl, setRedactedPdf);
  }

}, [originalUrl, redactedUrl]);

  function onDocumentLoadSuccess({
    numPages,
  }: {
    numPages: number;
  }) {
    setNumPages(numPages);
  }

  const handleZoomIn = () =>
    setScale((prev) => Math.min(prev + 0.2, 3.0));

  const handleZoomOut = () =>
    setScale((prev) => Math.max(prev - 0.2, 0.5));

  const handleResetZoom = () => setScale(1.0);

  const pages = Array.from(
    new Array(numPages || 0),
    (_, index) => index + 1
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-border">

      {/* Toolbar */}
      <div className="h-14 bg-card border-b flex items-center justify-between px-4 z-10 flex-shrink-0">

        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Original
          </div>

          {redactedPdf && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Secured Redaction
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2"></div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleResetZoom}
          >
            <Maximize className="h-4 w-4" />
          </Button>

        </div>
      </div>

      {/* PDF VIEWER */}
      <div className="flex-1 overflow-auto bg-slate-200/50 dark:bg-black/50 p-6">

        <div className="flex justify-center gap-8 min-w-max">

          {/* ORIGINAL PDF */}
          <div className="bg-white shadow-xl ring-1 ring-black/5 flex flex-col gap-4 p-4">

            {originalPdf ? (
              <Document
                file={originalPdf}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
              >
                {pages.map((pageNumber) => (
                  <div
                    key={`page_${pageNumber}`}
                    className="mb-4 shadow-sm border"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </Document>
            ) : (
              <div className="flex justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

          </div>

          {/* REDACTED PDF */}
          {redactedPdf && (
            <div className="bg-white shadow-xl ring-1 ring-black/5 flex flex-col gap-4 p-4 relative">

              <div className="absolute top-0 right-0 p-2 z-10">
                <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Secure Output
                </div>
              </div>

              <Document
                file={redactedPdf}
                loading={
                  <div className="flex justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
              >
                {pages.map((pageNumber) => (
                  <div
                    key={`page_${pageNumber}`}
                    className="mb-4 shadow-sm border ring-2 ring-emerald-500/20"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </Document>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}