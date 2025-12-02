
import React, { useState, useEffect } from 'react';
import { fetchDriveData } from '../services/apiService';
import { DirectoryItem, ItemType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderId: string, apiKey: string) => void;
  initialFolderId?: string;
  initialApiKey?: string;
}

export const ConnectModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialFolderId = '', initialApiKey = '' }) => {
  const [folderInput, setFolderInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  
  // Auto Refresh State
  const [autoRefresh, setAutoRefresh] = useState('off');

  // Load initial values
  useEffect(() => {
    if (isOpen) {
        setFolderInput(initialFolderId);
        setApiKeyInput(initialApiKey);
        setExportStatus('');
        // Load setting
        setAutoRefresh(localStorage.getItem('drive-auto-refresh') || 'off');
    }
  }, [isOpen, initialFolderId, initialApiKey]);

  if (!isOpen) return null;

  const extractFolderId = (input: string): string => {
      const match = input.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
      if (input.length > 20 && !input.includes('/')) return input;
      return input;
  };

  const handleSave = () => {
    const cleanId = extractFolderId(folderInput.trim());
    
    // Save Auto Refresh Setting
    localStorage.setItem('drive-auto-refresh', autoRefresh);
    
    onSave(cleanId, apiKeyInput.trim());
    onClose();
  };

  const handleExport = async (format: 'csv' | 'json') => {
      if (!apiKeyInput || !folderInput) return;
      
      setIsExporting(true);
      setExportStatus('Đang kết nối tới Google Drive...');
      
      try {
          const rootId = extractFolderId(folderInput.trim());
          let allFolders: DirectoryItem[] = [];
          let token: string | undefined = undefined;
          let pageCount = 0;

          // Fetch Loop to get ALL items
          do {
              setExportStatus(`Đang tải trang ${pageCount + 1}... (Đã tìm thấy ${allFolders.length} hồ sơ)`);
              
              const res = await fetchDriveData(
                  apiKeyInput.trim(),
                  rootId,
                  undefined, // No search query
                  'all',     // All time
                  'current', // Strict hierarchy (only direct children)
                  1000,      // Max page size per request
                  token
              );

              // Filter only folders (Patient records)
              const folders = res.items.filter(item => item.type === ItemType.FOLDER);
              allFolders = [...allFolders, ...folders];
              
              token = res.nextPageToken || undefined;
              pageCount++;

              // Safety break
              if (pageCount > 50) break; // Avoid infinite loops if something goes wrong (max 50k items)

          } while (token);

          setExportStatus(`Đang tạo file ${format.toUpperCase()}...`);

          const timestamp = new Date().toISOString().slice(0, 10);
          const fileName = `danh_sach_benh_nhan_${timestamp}`;

          if (format === 'json') {
              const dataStr = JSON.stringify(allFolders, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${fileName}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } else {
              // CSV Export
              // BOM for Excel to read UTF-8 correctly
              const BOM = "\uFEFF"; 
              let csvContent = BOM + "ID,Tên Hồ Sơ,Ngày Cập Nhật,Link Drive\n";
              
              allFolders.forEach(item => {
                  // Escape quotes in name
                  const safeName = item.name.replace(/"/g, '""');
                  // Format date
                  const date = new Date(item.dateAdded).toLocaleDateString('vi-VN');
                  csvContent += `${item.id},"${safeName}",${date},${item.url}\n`;
              });

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${fileName}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }

          setExportStatus(`Đã xuất thành công ${allFolders.length} hồ sơ!`);

      } catch (error: any) {
          console.error(error);
          setExportStatus(`Lỗi: ${error.message}`);
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </span>
            Cấu hình Hệ thống
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          
          {/* WARNING BANNER */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3 items-start">
             <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             <div className="text-sm text-orange-800">
                 <strong>Lưu ý quan trọng:</strong> Cấu hình bạn lưu tại đây chỉ được áp dụng trên <u>trình duyệt này</u> (Local).
                 <br/>
                 Để áp dụng cho tất cả mọi người, vui lòng cập nhật <strong>Environment Variables</strong> trên Netlify.
             </div>
          </div>

          {/* Section 1: Folder Config */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  Link Thư mục Gốc (Google Drive):
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                     </svg>
                  </div>
                  <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800 placeholder-gray-400"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                  />
              </div>
          </div>

          {/* Section 2: API Key Config */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  Google Drive API Key:
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                     </svg>
                  </div>
                  <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono text-gray-800 placeholder-gray-400"
                      placeholder="AIzaSy..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                  />
              </div>
              <p className="text-xs text-gray-500">
                  Key cần được tạo trên Google Cloud Console và kích hoạt Drive API.
              </p>
          </div>
          
          {/* Section 3: Auto Refresh Settings */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Tự động làm mới (Auto Refresh):
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                      value={autoRefresh} 
                      onChange={(e) => setAutoRefresh(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none"
                  >
                      <option value="off">Tắt (Thủ công)</option>
                      <option value="1">Mỗi 1 phút</option>
                      <option value="5">Mỗi 5 phút</option>
                      <option value="15">Mỗi 15 phút</option>
                  </select>
              </div>
              <p className="text-xs text-gray-500">
                  <span className="font-bold text-orange-600">Lưu ý:</span> Cập nhật quá thường xuyên (1 phút) có thể làm cạn kiệt Quota miễn phí của Google Drive API. Khuyên dùng 5 hoặc 15 phút.
              </p>
          </div>

          {/* Section 4: Export Data */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Xuất dữ liệu báo cáo:
              </label>
              <p className="text-xs text-gray-500">
                  Hệ thống sẽ quét toàn bộ thư mục gốc để lấy danh sách hồ sơ bệnh nhân.
              </p>
              
              <div className="flex gap-3">
                  <button 
                    onClick={() => handleExport('csv')}
                    disabled={isExporting || !apiKeyInput || !folderInput}
                    className="flex-1 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     Xuất Excel (CSV)
                  </button>
                  <button 
                    onClick={() => handleExport('json')}
                    disabled={isExporting || !apiKeyInput || !folderInput}
                    className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                     Xuất JSON
                  </button>
              </div>
              
              {isExporting && (
                  <div className="text-xs text-blue-600 flex items-center gap-2 animate-pulse bg-blue-50 p-2 rounded-lg">
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {exportStatus || 'Đang xử lý...'}
                  </div>
              )}
              {!isExporting && exportStatus && (
                  <div className={`text-xs p-2 rounded-lg ${exportStatus.startsWith('Lỗi') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                      {exportStatus}
                  </div>
              )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
             Đóng
           </button>
           <button 
             onClick={handleSave}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
           >
             Lưu Cấu Hình (Local)
           </button>
        </div>
      </div>
    </div>
  );
};
