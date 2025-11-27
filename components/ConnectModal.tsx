
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export const ConnectModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
            Cấu hình Google Drive API
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                   </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-amber-800">Chế độ Nội Bộ (Internal)</h3>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                        <p>Hệ thống đã tích hợp sẵn <strong>Internal Key</strong>. Bạn chỉ cần nhập nếu muốn dùng Key riêng.</p>
                        <p className="italic text-xs mt-2 text-amber-700">*Thư mục cần được chia sẻ công khai nếu sử dụng Key cá nhân.</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="space-y-4">
              <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Cách thay đổi Key (Tùy chọn):</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <li>Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>.</li>
                      <li>Tạo API Key mới cho thư mục của bạn.</li>
                      <li>Dán Key mới vào ô bên dưới để ghi đè cấu hình mặc định.</li>
                  </ol>
              </div>

            <div className="space-y-2 pt-2">
                <label className="block text-sm font-semibold text-gray-700">
                    Nhập API Key Mới (Để trống để dùng mặc định):
                </label>
                <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono text-gray-800 placeholder-gray-400 shadow-sm"
                    placeholder="Ví dụ: AIzaSyD..."
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
             disabled={!apiKey.trim()}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
           >
             Lưu API Key
           </button>
        </div>
      </div>
    </div>
  );
};
