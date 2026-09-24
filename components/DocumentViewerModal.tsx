import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink, 
  FileText, 
  Maximize2,
  Minimize2
} from 'lucide-react';
import { uploadsApi } from '../services/apiClient';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentUrl?: string;
  subtitle?: string;
  category?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  documentUrl,
  subtitle,
  category,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset controls when opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, documentUrl]);

  if (!isOpen || !documentUrl) return null;

  const resolvedUrl = uploadsApi.resolveUrl(documentUrl);
  const isPdf = resolvedUrl.toLowerCase().includes('.pdf') || resolvedUrl.startsWith('blob:') && resolvedUrl.includes('pdf');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-5xl max-h-[90vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white truncate">{title}</h3>
                {category && (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {category.replace('_', ' ')}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-slate-400 px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate"
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <RotateCw size={16} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              download
              title="Download Original File"
              className="p-2 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-colors"
            >
              <Download size={16} />
            </a>

            <button
              type="button"
              onClick={onClose}
              title="Close Preview (Esc)"
              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 rounded-xl transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/90 relative min-h-[400px]">
          {isPdf ? (
            <iframe
              src={resolvedUrl}
              title={title}
              className="w-full h-full min-h-[550px] rounded-2xl border border-slate-800 shadow-inner"
            />
          ) : (
            <div className="overflow-auto flex items-center justify-center p-4 w-full h-full">
              <img
                src={resolvedUrl}
                alt={title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800 bg-slate-900 select-none"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Verified Storage Document</span>
          </div>
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-bold"
          >
            Open in New Window <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
