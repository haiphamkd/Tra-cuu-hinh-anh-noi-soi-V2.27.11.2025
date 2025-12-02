
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SearchIcon, FolderIcon } from './components/Icons';
import { FolderCard } from './components/FolderCard';
import { SmartImportModal } from './components/SmartImportModal';
import { ConnectModal } from './components/ConnectModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FilePreviewModal } from './components/FilePreviewModal';
import { fetchDriveData, fetchFolderCount } from './services/apiService';
import { DirectoryItem, ApiResponse, ItemType } from './types';

// --- HARDCODED CONFIGURATION ---
// Cấu hình cứng tại đây để chạy ngay lập tức
const HARDCODED_ROOT_ID = "1KITVOLer-cLkQ8dmgYYaG8qaWzj1YJr1";
const HARDCODED_API_KEY = "AIzaSyBITtcZhbe4lu7HL1uroOSpe5SJpQytsmw";

interface HistoryItem {
  id: string;
  name: string;
}

type TimeRange = '7' | '14' | '30' | '90' | '180' | '365' | 'all';
type LimitOption = 100 | 500 | 1000 | 2000 | 3000 | 5000 | 'all';

const App: React.FC = () => {
  // --- CONFIG STATE ---
  
  // Root ID: LocalStorage > Env Var > Hardcoded
  const [rootFolderId, setRootFolderId] = useState<string>(() => {
    return localStorage.getItem('drive-root-id-v1') || import.meta.env?.VITE_ROOT_FOLDER_ID || HARDCODED_ROOT_ID;
  });

  // API Key: LocalStorage > Env Var > Hardcoded
  const [apiKey, setApiKey] = useState<string>(() => {
      return localStorage.getItem('drive-api-key-v1') || import.meta.env?.VITE_GOOGLE_API_KEY || HARDCODED_API_KEY;
  });

  // State Management
  const [items, setItems] = useState<DirectoryItem[]>([]);
  // Ref to track items without triggering re-renders in callbacks
  const itemsRef = useRef<DirectoryItem[]>([]);
  
  const [folderCache, setFolderCache] = useState<Record<string, DirectoryItem[]>>({});
  // Cache for folder sub-item counts: { folderId: count }
  const [statsCache, setStatsCache] = useState<Record<string, number>>({});
  // Ref to access latest cache inside effect without triggering re-runs
  const statsCacheRef = useRef<Record<string, number>>({});

  // Sync state to ref
  useEffect(() => {
    statsCacheRef.current = statsCache;
  }, [statsCache]);
  
  // Navigation State
  // Initial history depends on rootFolderId
  const [history, setHistory] = useState<HistoryItem[]>([{ id: rootFolderId, name: 'Kho Hồ Sơ Tổng' }]);
  
  // Effect to reset history when rootFolderId changes (e.g. after config update)
  useEffect(() => {
    setHistory([{ id: rootFolderId, name: 'Kho Hồ Sơ Tổng' }]);
    setFolderCache({});
    setItems([]);
  }, [rootFolderId]);

  const currentFolderId = history[history.length - 1]?.id;

  const [searchQuery, setSearchQuery] = useState('');
  
  // Helper to calculate date string
  const calculateDate = (range: TimeRange): string => {
      if (range === 'all') return 'all';
      const d = new Date();
      d.setDate(d.getDate() - Number(range));
      return d.toISOString();
  };

  const [timeRange, setTimeRange] = useState<TimeRange>('14'); 
  // Stable filter date state to ensure pageToken remains valid during pagination
  const [filterDate, setFilterDate] = useState<string>(() => calculateDate('14'));

  // Default Limit set to 1000 as requested
  const [limit, setLimit] = useState<LimitOption>(1000); 
  
  // Pagination State
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Auth & Config Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);

  const [previewItem, setPreviewItem] = useState<DirectoryItem | null>(null);
  
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Logo error state
  const [logoError, setLogoError] = useState(false);

  // Refs for race condition handling
  const latestRequestRef = useRef<number>(0);

  // Sync items state to ref
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Main Data Loading Logic
  const refreshData = useCallback(async (
      key: string, 
      folderId: string, 
      dateFilter: string, 
      itemLimit: LimitOption,
      token?: string
    ) => {
      if (!key) {
          if (!isConnectModalOpen) setError("Chưa có API Key. Vui lòng kiểm tra biến môi trường hoặc cấu hình.");
          return;
      }

      const isInitialLoad = !token;
      
      if (isInitialLoad) {
        setIsLoading(true);
        setItems([]); 
      } else {
        setIsFetchingMore(true);
      }
      
      if (isInitialLoad) setError(null);
      
      const requestId = Date.now();
      latestRequestRef.current = requestId;

      try {
          // Note: Passing undefined for query and 'current' scope effectively disables server-side search
          // We rely on 'browsing' mode logic in apiService
          let data: ApiResponse = await fetchDriveData(
              key, folderId, undefined, dateFilter, 'current', itemLimit, token
          );

          // AUTO-RETRY LOGIC:
          // If we are looking at a specific folder (not root), and it returns 0 items,
          // and we have a date filter active, retry immediately with 'all' time.
          if (
              isInitialLoad && 
              data.items.length === 0 && 
              dateFilter !== 'all' 
            ) {
              console.log("Folder empty with filter. Retrying with ALL time...");
              const retryData = await fetchDriveData(
                  key, folderId, undefined, 'all', 'current', itemLimit, undefined
              );
              
              if (retryData.items.length > 0) {
                  data = retryData;
                  // Automatically update UI controls to reflect reality
                  setTimeRange('all');
                  setFilterDate('all');
              }
          }
          
          if (latestRequestRef.current !== requestId) return;

          setItems(prev => {
              const combined = isInitialLoad ? data.items : [...prev, ...data.items];
              return combined;
          });

          // Pagination logic with limit check
          if (data.nextPageToken) {
               // USE REF for current count to avoid stale closures or dependency loops
               const currentCount = isInitialLoad ? data.items.length : (itemsRef.current.length + data.items.length);
               const maxLimit = itemLimit === 'all' ? 999999 : Number(itemLimit);
               
               if (currentCount < maxLimit) {
                   setNextPageToken(data.nextPageToken);
               } else {
                   setNextPageToken(null);
               }
          } else {
              setNextPageToken(null);
          }

      } catch (e: any) {
          if (latestRequestRef.current === requestId) {
              const msg = e.message;
              
              // Auto-recovery for bad tokens
              if (msg && msg.includes("Token") && token) {
                  console.warn("Invalid token detected, resetting pagination.");
                  setNextPageToken(null);
              } else if (isInitialLoad) {
                  setError(msg || "Không thể tải dữ liệu.");
              } else {
                  console.warn("Pagination stopped:", msg);
                  setNextPageToken(null);
              }
          }
      } finally {
          if (latestRequestRef.current === requestId) {
              setIsLoading(false);
              setIsFetchingMore(false);
          }
      }
  }, [isConnectModalOpen]);

  // Trigger subsequent fetches if token exists
  useEffect(() => {
      // STOP Pagination if we reached the user-requested limit
      if (typeof limit === 'number' && itemsRef.current.length >= limit) {
          return;
      }

      if (nextPageToken && !isLoading && !isFetchingMore && !error) {
          const timer = setTimeout(() => {
               refreshData(apiKey, currentFolderId, filterDate, limit, nextPageToken);
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [nextPageToken, isLoading, isFetchingMore, error, apiKey, currentFolderId, filterDate, limit, refreshData]);


  // --- MAIN CACHE & FETCH LOGIC ---
  useEffect(() => {
      // Skip if no key
      if (!apiKey) return;

      refreshData(apiKey, currentFolderId, filterDate, limit);
      
  }, [currentFolderId, apiKey, filterDate, limit, refreshData]); 


  // --- LAZY LOAD FOLDER COUNTS (PARALLEL BATCHING) ---
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Client-side filtering
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        result = result.filter(item => item.name.toLowerCase().includes(lowerQuery));
    }

    if (activeTag) {
        result = result.filter(item => item.tags && item.tags.includes(activeTag));
    }
    return result;
  }, [items, activeTag, searchQuery]);

  useEffect(() => {
    if (!apiKey) return;

    // Identify folders that are visible but don't have stats yet
    const visibleFolders = filteredItems
        .filter(item => item.type === ItemType.FOLDER && statsCacheRef.current[item.id] === undefined);

    if (visibleFolders.length === 0) return;

    let isMounted = true;

    // BATCH PROCESSING
    const processBatches = async () => {
        const BATCH_SIZE = 20; 
        
        for (let i = 0; i < visibleFolders.length; i += BATCH_SIZE) {
            if (!isMounted) break;

            const batch = visibleFolders.slice(i, i + BATCH_SIZE);
            
            // Execute batch in parallel
            const results = await Promise.all(
                batch.map(async (folder) => {
                    const count = await fetchFolderCount(apiKey, folder.id);
                    return { id: folder.id, count };
                })
            );

            if (!isMounted) break;

            // Update cache immediately after batch finishes
            setStatsCache(prev => {
                const update = { ...prev };
                results.forEach(res => {
                    update[res.id] = res.count;
                });
                return update;
            });
            
            results.forEach(res => {
                statsCacheRef.current[res.id] = res.count;
            });

            await new Promise(r => setTimeout(r, 50));
        }
    };

    processBatches();

    return () => { isMounted = false; };
  }, [filteredItems, apiKey]);


  // --- Handlers ---

  const handleManualImport = (newItems: DirectoryItem[]) => {
    setItems(newItems);
  };

  const handleConnectSave = (newFolderId: string, newApiKey: string) => {
      // Save ID
      if (newFolderId && newFolderId !== rootFolderId) {
          setRootFolderId(newFolderId);
          localStorage.setItem('drive-root-id-v1', newFolderId);
      }
      
      // Save Key
      if (newApiKey && newApiKey !== apiKey) {
          setApiKey(newApiKey);
          localStorage.setItem('drive-api-key-v1', newApiKey);
      }

      setSearchQuery('');
      setError(null);
  };

  const handleFolderNavigate = (item: DirectoryItem) => {
      setHistory(prev => [...prev, { id: item.id, name: item.name }]);
      setSearchQuery(''); 
      setActiveTag(null);
      setNextPageToken(null); 
  };

  const handleBreadcrumbNavigate = (index: number) => {
      setHistory(prev => prev.slice(0, index + 1));
      setSearchQuery('');
      setActiveTag(null);
      setNextPageToken(null);
  };

  const handleOpenPreview = (item: DirectoryItem) => {
    if (item) setPreviewItem(item);
  };

  const handleClosePreview = () => setPreviewItem(null);
  
  // Auth flow for config
  const handleOpenConfig = () => setIsAdminAuthOpen(true);
  const handleAuthSuccess = () => {
      setIsAdminAuthOpen(false);
      setIsConnectModalOpen(true);
  }
  
  const handleCloseConnectModal = () => setIsConnectModalOpen(false);
  const handleCloseAuthModal = () => setIsAdminAuthOpen(false);
  
  const handleOpenImportModal = () => setIsImportModalOpen(true);
  const handleCloseImportModal = () => setIsImportModalOpen(false);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
  };

  const handleClearSearch = () => {
      setSearchQuery(''); 
  };

  const handleRefreshClick = () => {
    setNextPageToken(null);
    setFolderCache({});
    const newDate = calculateDate(timeRange);
    setFilterDate(newDate);
  };
  
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newVal = e.target.value as TimeRange;
      setNextPageToken(null);
      setTimeRange(newVal);
      setFilterDate(calculateDate(newVal));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNextPageToken(null);
      const val = e.target.value;
      setLimit(val === 'all' ? 'all' : Number(val) as LimitOption);
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const source = searchQuery || activeTag ? filteredItems : items;
    const folders = source.filter(i => i.type === ItemType.FOLDER).length;
    const files = source.filter(i => i.type === ItemType.FILE).length;
    return { folders, files, total: source.length };
  }, [filteredItems, items, searchQuery, activeTag]);

  // Preview Navigation Logic
  const currentPreviewIndex = useMemo(() => {
    if (!previewItem) return -1;
    return filteredItems.findIndex(i => i.id === previewItem.id);
  }, [previewItem, filteredItems]);

  const hasNext = currentPreviewIndex !== -1 && currentPreviewIndex < filteredItems.length - 1;
  const hasPrev = currentPreviewIndex > 0;

  const handleNextPreview = useCallback(() => {
    if (hasNext) {
        setPreviewItem(filteredItems[currentPreviewIndex + 1]);
    }
  }, [hasNext, filteredItems, currentPreviewIndex]);

  const handlePrevPreview = useCallback(() => {
    if (hasPrev) {
        setPreviewItem(filteredItems[currentPreviewIndex - 1]);
    }
  }, [hasPrev, filteredItems, currentPreviewIndex]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm backdrop-blur-lg bg-white/90 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleBreadcrumbNavigate(0)}>
            {/* Logo Image with Fallback */}
            {logoError ? (
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                        <path d="M19 2H5a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3Zm-7 14a1 1 0 0 1-2 0v-3H7a1 1 0 0 1 0-2h3V8a1 1 0 0 1 2 0v3h3a1 1 0 0 1 0 2h-3v3Z"/>
                    </svg>
                </div>
            ) : (
                <img 
                    src="/logo.png" 
                    alt="Logo ENT Clinic" 
                    className="w-14 h-14 object-contain rounded-xl bg-white"
                    onError={() => setLogoError(true)}
                />
            )}
            
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-blue-900 tracking-tight leading-tight uppercase">PHÒNG KHÁM TAI MŨI HỌNG BUÔN HỒ</h1>
              <a href={`https://drive.google.com/drive/folders/${rootFolderId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1 mt-0.5">
                Kho dữ liệu Drive ↗
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative group">
              <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                  <div className="relative flex items-center">
                    <SearchIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Lọc nhanh tên..." value={searchQuery} onChange={handleSearchInputChange} className="pl-9 pr-2 py-1.5 w-64 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder-gray-400 text-gray-800" />
                    {searchQuery && (
                         <button type="button" onClick={handleClearSearch} className="absolute right-2 text-gray-400 hover:text-gray-600">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                    )}
                  </div>
              </div>
            </form>
            
            <button 
                onClick={handleOpenConfig} 
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors border text-sm ${apiKey ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`} 
                title="Cấu hình hệ thống"
            >
                <span className="hidden sm:inline">
                    {apiKey ? 'Cấu hình' : 'Thiếu API Key'}
                </span>
            </button>
          </div>
        </div>
        
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2 border-t border-gray-100">
           <form onSubmit={handleSearchSubmit} className="relative flex gap-2 pt-2">
               <input type="text" placeholder="Lọc nhanh tên..." value={searchQuery} onChange={handleSearchInputChange} className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
           </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Breadcrumbs items={history} onNavigate={handleBreadcrumbNavigate} />

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 tracking-tight">
                {history.length > 1 ? history[history.length - 1].name : 'Danh sách hồ sơ'}
            </h2>
            <div className="text-gray-500 mt-1.5 text-xs font-medium flex items-center gap-2">
                {isLoading ? (
                    <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang đồng bộ dữ liệu...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                         {searchQuery ? (
                            <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                Đang lọc: <strong>{stats.total}</strong> kết quả
                            </span>
                         ) : (
                            <span className="text-gray-600">
                                Hiển thị <strong>{stats.total}</strong> mục
                            </span>
                         )}
                         
                         {/* Detailed Counts */}
                         <span className="text-gray-400 mx-1">|</span>
                         <span className="flex items-center gap-1.5" title="Số lượng thư mục con">
                             <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" /></svg>
                             {stats.folders} hồ sơ
                         </span>
                         <span className="text-gray-400 mx-1">•</span>
                         <span className="flex items-center gap-1.5" title="Số lượng tệp tin">
                             <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875ZM12.75 12a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V18a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V12Z" clipRule="evenodd" /></svg>
                             {stats.files} tệp tin
                         </span>

                        {isFetchingMore && (
                            <span className="ml-2 text-orange-500 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang tải thêm...
                            </span>
                        )}
                    </span>
                )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <select value={timeRange} onChange={handleTimeRangeChange} disabled={isLoading || isFetchingMore} className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm py-2 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm font-medium">
                      <option value="7">7 ngày qua</option>
                      <option value="14">2 tuần qua</option>
                      <option value="30">30 ngày qua</option>
                      <option value="90">3 tháng qua</option>
                      <option value="180">6 tháng qua</option>
                      <option value="365">1 năm qua</option>
                      <option value="all">Tất cả thời gian</option>
                  </select>
              </div>
              
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                  </div>
                  <select value={limit} onChange={handleLimitChange} disabled={isLoading || isFetchingMore} className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm py-2 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm font-medium">
                      <option value="100">100 hồ sơ</option>
                      <option value="500">500 hồ sơ</option>
                      <option value="1000">1000 hồ sơ</option>
                      <option value="2000">2000 hồ sơ</option>
                      <option value="3000">3000 hồ sơ</option>
                      <option value="5000">5000 hồ sơ</option>
                      <option value="all">Tất cả</option>
                  </select>
              </div>

              {apiKey && (
                  <button onClick={handleRefreshClick} disabled={isLoading} className="bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 border border-gray-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Làm mới dữ liệu">
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
              )}
          </div>
        </div>

        {/* ERROR DISPLAYS */}
        {error && (
             <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-3 font-bold text-red-800">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Lỗi kết nối API
                </div>
                <p>{error}</p>
                
                {error.includes("API_KEY_BLOCKED") && (
                    <div className="mt-2 bg-white p-3 rounded-lg border border-red-100">
                        <p className="font-bold text-red-800 mb-1">Hướng dẫn khắc phục:</p>
                        <ul className="list-disc ml-5 space-y-1 text-gray-700">
                            <li>Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-semibold">Google Cloud Console &rarr; Credentials</a>.</li>
                            <li>Chọn API Key đang sử dụng.</li>
                            <li>Tại mục <strong>"API restrictions"</strong> (Hạn chế API):
                                <ul className="list-circle ml-5 mt-1 text-xs text-gray-600">
                                    <li>Chọn <strong>"Don't restrict key"</strong> (Không hạn chế).</li>
                                    <li>HOẶC chọn <strong>"Restrict key"</strong> rồi tích chọn thêm <strong>"Google Drive API"</strong> vào danh sách.</li>
                                </ul>
                            </li>
                            <li>Lưu lại và đợi 1-2 phút rồi thử lại.</li>
                        </ul>
                    </div>
                )}

                {(error.includes("Anyone with the link") || error.includes("insufficientFilePermissions")) && (
                    <div className="mt-2 bg-white p-3 rounded-lg border border-red-100">
                        <p className="font-bold text-red-800 mb-1">Cách mở quyền truy cập:</p>
                        <ol className="list-decimal ml-5 space-y-1 text-gray-700">
                            <li>Truy cập <a href={`https://drive.google.com/drive/folders/${rootFolderId}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-semibold">Google Drive</a>.</li>
                            <li>Nhấn chuột phải vào thư mục $\rightarrow$ Chọn <strong>Chia sẻ (Share)</strong>.</li>
                            <li>Tại mục "Quyền truy cập chung" (General access), đổi từ "Hạn chế" sang <strong>"Bất kỳ ai có đường liên kết" (Anyone with the link)</strong>.</li>
                            <li>Nhấn <strong>Xong (Done)</strong> và tải lại trang này.</li>
                        </ol>
                    </div>
                )}

                <div className="flex gap-3 mt-2">
                    <button onClick={handleOpenConfig} className="bg-red-600 text-white px-4 py-2 rounded-lg self-start font-medium hover:bg-red-700 transition-colors shadow-sm">Cấu hình hệ thống</button>
                    <button onClick={handleRefreshClick} className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg self-start font-medium hover:bg-red-50 transition-colors shadow-sm">Thử lại</button>
                </div>
             </div>
        )}

        {/* Grid */}
        {isLoading && items.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>)}
            </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredItems.map(item => (
                <FolderCard 
                    key={item.id} 
                    item={item} 
                    onNavigate={handleFolderNavigate} 
                    onPreview={handleOpenPreview}
                    folderCount={statsCache[item.id]} 
                />
                ))}
            </div>
            {isFetchingMore && (
                <div className="mt-8 flex justify-center">
                    <div className="bg-white border border-gray-200 shadow-lg rounded-full px-6 py-2 flex items-center gap-3">
                         <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Đang tải thêm...</span>
                    </div>
                </div>
            )}
          </>
        ) : (
          !error && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <h3 className="text-xl font-bold text-gray-900">
                    {apiKey ? 'Không tìm thấy dữ liệu' : 'Chào mừng!'}
                </h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    {apiKey 
                     ? (searchQuery ? 'Không có mục nào khớp với từ khóa tìm kiếm trong danh sách đã tải.' : 'Thư mục trống hoặc không khớp với bộ lọc thời gian.')
                     : 'Vui lòng kiểm tra biến môi trường process.env.API_KEY để bắt đầu duyệt tài liệu.'}
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                    {apiKey && (
                        <button onClick={handleClearSearch} className="text-gray-500 hover:text-gray-700 text-sm underline mt-2">
                            {searchQuery ? 'Xóa bộ lọc tìm kiếm' : 'Quay lại thư mục gốc'}
                        </button>
                    )}
                </div>
            </div>
          )
        )}
      </main>

      <SmartImportModal isOpen={isImportModalOpen} onClose={handleCloseImportModal} onImport={handleManualImport} />
      
      <AdminAuthModal 
        isOpen={isAdminAuthOpen}
        onClose={handleCloseAuthModal}
        onSuccess={handleAuthSuccess}
      />
      
      <ConnectModal 
        isOpen={isConnectModalOpen} 
        onClose={handleCloseConnectModal} 
        onSave={handleConnectSave} 
        initialFolderId={rootFolderId} 
        initialApiKey={apiKey}
      />
      
      <FilePreviewModal 
        item={previewItem} 
        onClose={handleClosePreview}
        onNext={handleNextPreview}
        onPrev={handlePrevPreview}
        hasNext={hasNext}
        hasPrev={hasPrev} 
      />

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
              <p>Hệ thống Tra cứu Hồ sơ Nội soi (JS Client Mode) &copy; 2024</p>
          </div>
      </footer>
    </div>
  );
};

export default App;
