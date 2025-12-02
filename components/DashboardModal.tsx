
import React, { useMemo, useState } from 'react';
import { DirectoryItem, ItemType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: DirectoryItem[];
}

type AnalysisRange = '7' | '14' | '30' | '90' | 'all';

interface DailyStat {
    date: string;         // YYYY-MM-DD
    displayDate: string;  // DD/MM/YYYY
    newCount: number;
    updatedCount: number;
    total: number;
}

export const DashboardModal: React.FC<Props> = ({ isOpen, onClose, items }) => {
  // Mặc định xem 14 ngày (2 tuần) để đồng bộ với App
  const [range, setRange] = useState<AnalysisRange>('14');

  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;

    const now = new Date();
    // Tính mốc thời gian bắt đầu (startDate)
    let startDate = new Date();
    if (range === 'all') {
        startDate = new Date(0); // 1970
    } else {
        startDate.setDate(now.getDate() - parseInt(range));
        startDate.setHours(0, 0, 0, 0);
    }

    let newFolders = 0;
    let updatedFolders = 0;
    let totalSize = 0;
    let imageCount = 0;
    let videoCount = 0;
    let otherCount = 0;

    // Map để gom nhóm theo ngày (Key: YYYY-MM-DD)
    const dailyMap = new Map<string, DailyStat>();
    
    // Nếu chọn ngày cụ thể, khởi tạo sẵn các ngày trong Map để biểu đồ không bị đứt quãng
    if (range !== 'all') {
        const daysToShow = parseInt(range);
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            
            dailyMap.set(key, { 
                date: key, 
                displayDate: displayDate, 
                newCount: 0, 
                updatedCount: 0, 
                total: 0 
            });
        }
    }

    items.forEach(item => {
        // Lấy thông tin thời gian
        const modified = new Date(item.dateAdded);
        const created = item.createdTime ? new Date(item.createdTime) : modified;

        // Chỉ xét các item có hoạt động (Modified) trong khoảng thời gian chọn
        if (modified >= startDate) {
            
            // Tính toán dung lượng & loại file
            if (item.size) totalSize += item.size;
            if (item.type !== ItemType.FOLDER) {
                if (item.mimeType?.startsWith('image/')) imageCount++;
                else if (item.mimeType?.startsWith('video/')) videoCount++;
                else otherCount++;
            }

            // Logic Phân loại Hồ sơ (Chỉ tính Folder)
            if (item.type === ItemType.FOLDER) {
                // Key cho biểu đồ
                const dateKey = modified.toISOString().slice(0, 10);
                const d = modified;
                
                // Logic Mới vs Cập nhật:
                const isCreatedRecently = created >= startDate;
                
                let isNew = false;
                let isUpdate = false;

                if (isCreatedRecently) {
                    newFolders++;
                    isNew = true;
                } else {
                    updatedFolders++;
                    isUpdate = true;
                }

                // Đưa vào biểu đồ
                if (!dailyMap.has(dateKey) && range === 'all') {
                     dailyMap.set(dateKey, {
                        date: dateKey,
                        displayDate: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
                        newCount: 0,
                        updatedCount: 0,
                        total: 0
                    });
                }

                const entry = dailyMap.get(dateKey);
                if (entry) {
                    if (isNew) entry.newCount++;
                    if (isUpdate) entry.updatedCount++;
                    entry.total++;
                }
            }
        }
    });

    // Chuyển Map thành Array và sắp xếp theo ngày cũ -> mới
    let dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Nếu quá nhiều ngày (chế độ All hoặc 90), chỉ lấy 15 ngày có hoạt động gần nhất để vẽ cho đẹp
    if (range === 'all' || range === '90') {
        dailyStats = dailyStats.filter(d => d.total > 0).slice(-15); 
    }

    return {
        newFolders,
        updatedFolders,
        totalSize,
        imageCount,
        videoCount,
        otherCount,
        dailyStats
    };
  }, [items, range]);

  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Tính chiều cao tối đa cho biểu đồ
  const maxChartValue = stats ? Math.max(...stats.dailyStats.map(d => d.total), 1) : 1;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Changed max-w-5xl to max-w-7xl for wider modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md">
                <ChartBarIcon />
            </span>
            Báo Cáo Hoạt Động
          </h2>
          <div className="flex items-center gap-3">
              <select 
                value={range} 
                onChange={(e) => setRange(e.target.value as AnalysisRange)}
                className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer font-medium text-gray-700"
              >
                  <option value="7">7 ngày qua</option>
                  <option value="14">2 tuần qua</option>
                  <option value="30">30 ngày qua</option>
                  <option value="90">3 tháng qua</option>
                  <option value="all">Tất cả danh sách</option>
              </select>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                <CloseIcon />
              </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-50/50 flex-1">
            {!stats ? (
                <div className="text-center py-20 text-gray-500">Chưa có dữ liệu. Vui lòng tải danh sách hồ sơ trước.</div>
            ) : (
                <div className="space-y-6">
                    
                    {/* 1. Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Hồ sơ mới */}
                        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Hồ sơ mới tạo</p>
                                    <h3 className="text-3xl font-bold text-gray-800">{stats.newFolders}</h3>
                                    <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                                        Trong {range === 'all' ? 'tất cả' : `${range} ngày`}
                                    </p>
                                </div>
                                <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                                    <FolderPlusIcon />
                                </div>
                            </div>
                        </div>

                        {/* Hồ sơ cập nhật */}
                        <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Hồ sơ cập nhật (Tái khám)</p>
                                    <h3 className="text-3xl font-bold text-gray-800">{stats.updatedFolders}</h3>
                                    <p className="text-xs text-orange-600 mt-2 font-medium flex items-center gap-1 bg-orange-50 w-fit px-2 py-0.5 rounded-full">
                                        Khách cũ có hoạt động mới
                                    </p>
                                </div>
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                                    <RefreshIcon />
                                </div>
                            </div>
                        </div>

                        {/* Dung lượng */}
                        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Dung lượng sử dụng</p>
                                    <h3 className="text-3xl font-bold text-gray-800">{formatSize(stats.totalSize)}</h3>
                                    <div className="text-xs text-emerald-600 mt-2 font-medium flex gap-2">
                                       <span className="bg-emerald-50 px-2 py-0.5 rounded-full">{stats.imageCount} Ảnh</span>
                                       <span className="bg-emerald-50 px-2 py-0.5 rounded-full">{stats.videoCount} Video</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                                    <DatabaseIcon />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Stacked Bar Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <ChartBarIcon className="text-indigo-600 w-5 h-5" />
                                    Biểu đồ hoạt động
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Thống kê số lượng hồ sơ theo ngày (Tối đa 15 ngày hiển thị)</p>
                            </div>
                            
                            {/* Legend */}
                            <div className="flex gap-4 text-xs font-medium bg-gray-50 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-sm bg-blue-500 shadow-sm"></span> 
                                    <span>Mới tạo</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-sm bg-orange-500 shadow-sm"></span> 
                                    <span>Cập nhật</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-gray-100 relative">
                             {/* Grid Lines (Optional visual guide) */}
                             <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                                 <div className="w-full h-px bg-gray-900"></div>
                                 <div className="w-full h-px bg-gray-900"></div>
                                 <div className="w-full h-px bg-gray-900"></div>
                                 <div className="w-full h-px bg-gray-900"></div>
                                 <div className="w-full h-px bg-gray-900"></div>
                             </div>

                            {stats.dailyStats.map((stat, idx) => {
                                const heightPercent = maxChartValue > 0 ? (stat.total / maxChartValue) * 100 : 0;
                                const newPercent = stat.total > 0 ? (stat.newCount / stat.total) * 100 : 0;
                                const updatedPercent = stat.total > 0 ? (stat.updatedCount / stat.total) * 100 : 0;

                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 group relative z-10 h-full justify-end">
                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg left-1/2 -translate-x-1/2">
                                            <div className="font-bold border-b border-gray-600 pb-1 mb-1 text-center">{stat.displayDate}</div>
                                            <div className="flex justify-between gap-2"><span>Mới:</span> <span className="font-bold">{stat.newCount}</span></div>
                                            <div className="flex justify-between gap-2"><span>Cập nhật:</span> <span className="font-bold">{stat.updatedCount}</span></div>
                                            <div className="flex justify-between gap-2 border-t border-gray-600 mt-1 pt-1"><span>Tổng:</span> <span className="font-bold">{stat.total}</span></div>
                                        </div>

                                        {/* Value Label */}
                                        <div className="text-[10px] font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {stat.total}
                                        </div>
                                        
                                        {/* Bar Container */}
                                        <div 
                                            className="w-full max-w-[40px] bg-gray-100 rounded-t-sm relative flex flex-col-reverse overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                                            style={{ height: `${Math.max(heightPercent, 2)}%` }} // Minimum 2% height for visibility
                                        >
                                            {/* Stacked Segments */}
                                            {stat.total > 0 && (
                                                <>
                                                    <div style={{ height: `${newPercent}%` }} className="w-full bg-blue-500 transition-all duration-500 border-t border-white/20"></div>
                                                    <div style={{ height: `${updatedPercent}%` }} className="w-full bg-orange-500 transition-all duration-500 border-t border-white/20"></div>
                                                </>
                                            )}
                                        </div>

                                        {/* X-Axis Label - Rotated if many items */}
                                        <div className={`text-[10px] text-gray-500 mt-2 font-medium whitespace-nowrap ${stats.dailyStats.length > 7 ? 'transform -rotate-45 origin-top-left translate-y-2 translate-x-2' : ''}`}>
                                            {stat.displayDate}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
            >
                Đóng Báo Cáo
            </button>
        </div>
      </div>
    </div>
  );
};

// --- Local Icons Components for this file ---
const ChartBarIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>
);
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const FolderPlusIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
);
const RefreshIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const DatabaseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s8-1.79 8-4" /></svg>
);
