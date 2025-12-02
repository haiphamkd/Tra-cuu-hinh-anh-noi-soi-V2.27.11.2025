
import React, { useState } from 'react';
import { DirectoryItem, ItemType } from '../types';
import { FolderIcon, FileIcon, LinkIcon } from './Icons';

interface Props {
  item: DirectoryItem;
  onNavigate: (item: DirectoryItem) => void;
  onPreview?: (item: DirectoryItem) => void;
  folderCount?: number;
}

export const FolderCard: React.FC<Props> = ({ item, onNavigate, onPreview, folderCount }) => {
  const isFolder = item.type === ItemType.FOLDER;
  const isImage = item.mimeType?.startsWith('image/');
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isFolder) {
      onNavigate(item);
    } else if (onPreview) {
      onPreview(item);
    } else {
        window.open(item.url, '_blank');
    }
  };

  // Helper to format bytes
  const formatSize = (bytes?: number) => {
      if (bytes === undefined) return '';
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to format date with time
  const formatDate = (dateString: string) => {
      try {
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('vi-VN', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
          }).format(date);
      } catch (e) {
          return '';
      }
  };

  // Image Thumbnail URL
  const thumbnailUrl = isImage ? `https://lh3.googleusercontent.com/d/${item.id}=w400` : null;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200 flex flex-col h-full overflow-hidden">
      {/* Click Handler */}
      <a 
        href={item.url} 
        onClick={handleClick}
        className="flex-1 flex flex-col h-full"
      >
        {/* Thumbnail or Icon Area */}
        <div 
            className={`relative ${isImage && !imgError ? 'aspect-[4/3]' : 'p-3 flex-shrink-0'}`}
            // Inline style fallback to prevent giant images if Tailwind fails
            style={isImage && !imgError ? { aspectRatio: '4/3', width: '100%', overflow: 'hidden' } : {}}
        >
            {isImage && !imgError && thumbnailUrl ? (
                <div className="w-full h-full bg-gray-100 relative overflow-hidden">
                    <img 
                        src={thumbnailUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        // Inline fallback
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${isFolder ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                        {isFolder ? <FolderIcon className="w-7 h-7" /> : <FileIcon className="w-7 h-7" />}
                    </div>
                    {/* External Link Indicator */}
                    <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                         {isFolder ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                         ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                         )}
                    </div>
                </div>
            )}
        </div>

        {/* Content Info */}
        <div className="p-3 flex-1 flex flex-col">
            {/* Header: Title + Badge */}
            <div className="flex justify-between items-start gap-2 mb-1">
                <h3 className="font-bold text-gray-800 line-clamp-2 text-sm leading-snug group-hover:text-blue-700 transition-colors pt-0.5 break-words" title={item.name}>
                    {item.name}
                </h3>
                
                {/* Count Badge (Tag Style) - Orange if > 1, Blue otherwise */}
                {isFolder && folderCount !== undefined && folderCount > 0 && (
                     <span 
                        className={`flex-shrink-0 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm transform group-hover:scale-105 transition-transform leading-tight ${folderCount > 1 ? 'bg-orange-600' : 'bg-blue-600'}`} 
                        title={`${folderCount} thư mục con`}
                     >
                         {folderCount}
                     </span>
                )}
                 {isFolder && folderCount === undefined && (
                     <div className="flex-shrink-0 w-6 h-4 bg-gray-100 rounded animate-pulse" />
                 )}
            </div>
            
            {item.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.description}
                </p>
            )}

            {/* Footer: Date or File Size */}
            <div className="mt-auto pt-2 border-t border-gray-50">
                {isFolder ? (
                   <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       Cập nhật: {formatDate(item.dateAdded)}
                   </div>
                ) : (
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                        {item.size ? (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{formatSize(item.size)}</span>
                        ) : null}
                        <span className="ml-auto flex items-center gap-1">
                            {formatDate(item.dateAdded)}
                        </span>
                    </div>
                )}
            </div>
        </div>
      </a>

      {/* Link Display & Copy Section */}
      <div className="px-3 pb-3 pt-0">
          <div className="flex items-center bg-gray-50 rounded-md border border-gray-100 px-2 py-1 group-hover:bg-white group-hover:border-blue-100 transition-colors">
             <LinkIcon className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0 group-hover:text-blue-400" />
             <input 
                type="text" 
                readOnly 
                value={item.url} 
                className="flex-1 bg-transparent border-none text-[10px] text-gray-500 focus:ring-0 p-0 w-full truncate font-mono select-all group-hover:text-blue-600 outline-none"
                onClick={(e) => e.currentTarget.select()}
             />
             <button 
                onClick={handleCopyLink}
                className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors"
                title="Sao chép liên kết"
             >
                {copied ? (
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-3 h-3 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
             </button>
          </div>
      </div>
    </div>
  );
};
