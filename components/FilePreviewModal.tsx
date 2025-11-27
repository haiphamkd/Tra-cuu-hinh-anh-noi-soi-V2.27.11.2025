
import React, { useEffect, useState, useRef } from 'react';
import { DirectoryItem } from '../types';
import { PlusIcon, MinusIcon, ArrowPathIcon } from './Icons';

interface Props {
  item: DirectoryItem | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const FilePreviewModal: React.FC<Props> = ({ 
  item, 
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) => {
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reset zoom when item changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [item?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      if (e.key === 'Escape') onClose();
      if ((e.key === 'ArrowRight' || e.key === ' ') && hasNext && onNext) {
          e.preventDefault();
          onNext();
      }
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
          e.preventDefault();
          onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, hasNext, hasPrev, onNext, onPrev]);

  if (!item) return null;

  // Construct a preview-friendly URL
  const imagePreviewUrl = `https://lh3.googleusercontent.com/d/${item.id}`;
  const genericPreviewUrl = `https://drive.google.com/file/d/${item.id}/preview`;

  const isImage = item.mimeType?.startsWith('image/');

  // Zoom Handlers
  const handleZoomIn = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setScale(prev => {
          const newScale = Math.max(prev - 0.5, 1);
          if (newScale === 1) setPosition({ x: 0, y: 0 }); // Reset pos if zoomed out completely
          return newScale;
      });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setScale(1);
      setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (!isImage) return;
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom simulation
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
      }
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      if (scale > 1) {
          e.preventDefault();
          setIsDragging(true);
          dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
          e.preventDefault();
          setPosition({
              x: e.clientX - dragStartRef.current.x,
              y: e.clientY - dragStartRef.current.y
          });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full h-full sm:rounded-xl overflow-hidden flex flex-col shadow-2xl border-0 sm:border border-gray-800 bg-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex flex-col">
              <h3 className="text-lg font-medium truncate max-w-[200px] sm:max-w-md drop-shadow-md" title={item.name}>{item.name}</h3>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
             <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        {hasPrev && (
            <button 
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm z-30 group border border-white/5 outline-none focus:ring-2 focus:ring-white/20"
                title="Trước (Left Arrow)"
            >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
        )}
        
        {hasNext && (
            <button 
                onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm z-30 group border border-white/5 outline-none focus:ring-2 focus:ring-white/20"
                title="Sau (Right Arrow / Space)"
            >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        )}

        {/* Content */}
        <div 
            className="flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden relative"
            onWheel={handleWheel}
        >
             {isImage ? (
                 <div 
                    className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                 >
                     <img 
                        src={imagePreviewUrl} 
                        alt={item.name} 
                        className="max-w-full max-h-full object-contain transition-transform duration-75 ease-linear will-change-transform"
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        }}
                        draggable={false}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                     />
                 </div>
             ) : (
                 <iframe 
                    src={genericPreviewUrl} 
                    title={item.name}
                    className="w-full h-full border-0"
                    allow="autoplay"
                 />
             )}
        </div>
        
        {/* Footer Controls & Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none flex flex-col items-center gap-3">
            
            {/* Zoom Controls (Image Only) */}
            {isImage && (
                <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/10">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-white/20 rounded-full text-white/90 transition-colors disabled:opacity-50" disabled={scale <= 1}>
                        <MinusIcon className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-mono text-white/80 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-white/20 rounded-full text-white/90 transition-colors disabled:opacity-50" disabled={scale >= 5}>
                        <PlusIcon className="w-5 h-5" />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-1"></div>
                    <button onClick={handleResetZoom} className="p-2 hover:bg-white/20 rounded-full text-white/90 transition-colors" title="Đặt lại">
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="pointer-events-auto flex justify-center pb-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-white hover:underline bg-black/50 px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10">
                    Xem file gốc
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};
