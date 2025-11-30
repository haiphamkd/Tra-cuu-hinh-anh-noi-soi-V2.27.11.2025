
import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, folderId: string) => void;
  initialFolderId?: string;
}

export const ConnectModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialFolderId = '' }) => {
  const [apiKey, setApiKey] = useState('');
  const [folderInput, setFolderInput] = useState('');

  // Load initial value when modal opens
  useEffect(() => {
    if (isOpen) {
        setFolderInput(initialFolderId);
    }
  }, [isOpen, initialFolderId]);

  if (!isOpen) return null;

  const extractFolderId = (input: string): string => {
      // Case 1: Full URL (https://drive.google.com/drive/folders/1ABC...)
      const match = input.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
      
      // Case 2: Just the ID
      if (input.length > 20 && !input.includes('/')) return input;

      return input; // Return as is (fallback)
  };

  const handleSave = () => {
    const cleanId = extractFolderId(folderInput.trim());
    
    // Allow saving if at least one field is provided (or keeping existing if empty but intended)
    // Here we enforce folder ID if changed
    onSave(apiKey.trim(), cleanId);
    onClose();
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

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Folder Config */}
          <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  Link Thư mục Gốc (Google Drive):
                  <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full">* Quan trọng</span>
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                     </svg>
                  </div>
                  <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800 placeholder-gray-400 shadow-sm"
                      placeholder="Dán link thư mục vào đây (https://drive.google.com/...)"
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                  />
              </div>
              <p className="text-xs text-gray-500 ml-1">
                  Dán toàn bộ đường link từ trình duyệt, hệ thống sẽ tự lấy ID.
              </p>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: API Key */}
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-gray-800">
                      API Key (Nâng cao):
                  </label>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-medium border border-green-100">
                      Đã tích hợp sẵn Key nội bộ
                  </span>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100">
                  Chỉ nhập nếu bạn muốn dùng Key riêng. Để trống để dùng Key mặc định của phòng khám.
              </div>

              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                     </svg>
                  </div>
                  <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono text-gray-800 placeholder-gray-400 shadow-sm"
                      placeholder="AIzaSyD... (Để trống để dùng mặc định)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                  />
              </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
             Hủy bỏ
           </button>
           <button 
             onClick={handleSave}
             disabled={!folderInput.trim()}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
           >
             Lưu Cấu Hình
           </button>
        </div>
      </div>
    </div>
  );
};
