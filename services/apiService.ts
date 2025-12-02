
import { ApiResponse, ItemType, DirectoryItem } from "../types";

const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";

export const fetchFolderCount = async (apiKey: string, folderId: string): Promise<number> => {
    try {
        const url = new URL(GOOGLE_DRIVE_API_URL);
        // Query to count only folders inside the parent
        url.searchParams.append("q", `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        url.searchParams.append("key", apiKey);
        // Increase limit to 1000 to ensure we count almost all subfolders in one go request without pagination
        url.searchParams.append("pageSize", "1000"); 
        url.searchParams.append("fields", "files(id)");
        url.searchParams.append("supportsAllDrives", "true");
        url.searchParams.append("includeItemsFromAllDrives", "true");

        const response = await fetch(url.toString());
        if (!response.ok) return 0;
        
        const data = await response.json();
        return data.files?.length || 0;
    } catch (e) {
        return 0;
    }
};

// New function for Incremental Updates (Smart Refresh)
export const fetchRecentChanges = async (
    apiKey: string,
    rootFolderId: string,
    sinceTime: string
): Promise<DirectoryItem[]> => {
    try {
        const url = new URL(GOOGLE_DRIVE_API_URL);
        
        // Query: Only items modified AFTER the last check
        let q = `modifiedTime > '${sinceTime}' and trashed = false`;
        
        if (rootFolderId) {
            q += ` and '${rootFolderId}' in parents`;
        }

        url.searchParams.append("q", q);
        url.searchParams.append("key", apiKey);
        url.searchParams.append("supportsAllDrives", "true");
        url.searchParams.append("includeItemsFromAllDrives", "true");
        // Added createdTime to fields
        url.searchParams.append("fields", "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, iconLink, thumbnailLink)");
        url.searchParams.append("pageSize", "100"); 
        url.searchParams.append("orderBy", "modifiedTime desc");

        const response = await fetch(url.toString());
        if (!response.ok) return [];

        const data = await response.json();
        
        if (!data.files || data.files.length === 0) return [];

        return data.files.map((file: any) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            return {
                id: file.id,
                name: file.name,
                url: file.webViewLink,
                type: isFolder ? ItemType.FOLDER : ItemType.FILE,
                description: "",
                tags: isFolder ? ['Thư mục'] : ['Tệp tin'],
                dateAdded: file.modifiedTime,
                createdTime: file.createdTime, // Map createdTime
                mimeType: file.mimeType,
                size: file.size ? parseInt(file.size) : undefined,
            };
        });
    } catch (error) {
        console.error("Smart Refresh Error:", error);
        return [];
    }
};

export const fetchDriveData = async (
    apiKey: string, 
    folderId: string = "1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk", // Default Root ID
    searchQuery?: string, 
    days?: string | number,
    scope: 'global' | 'current' = 'global',
    limit: string | number = 1000,
    pageToken?: string,
    phase?: string // kept for compatibility
): Promise<ApiResponse> => {
  
  if (!apiKey) {
      throw new Error("Chưa cấu hình API Key.");
  }

  try {
    const url = new URL(GOOGLE_DRIVE_API_URL);
    
    // 1. Construct the 'q' parameter
    let qClauses: string[] = ["trashed = false"];

    // -- Search vs Browse Logic --
    const isSearching = searchQuery && searchQuery.trim() !== "";
    
    if (isSearching) {
        const safeQuery = searchQuery!.replace(/'/g, "\\'");
        qClauses.push(`name contains '${safeQuery}'`);
        
        if (scope === 'current' && folderId) {
            qClauses.push(`'${folderId}' in parents`);
        }
    } else {
        if (folderId) {
            qClauses.push(`'${folderId}' in parents`);
        }
    }

    // -- Time Filter --
    if (days && days !== 'all') {
        let isoDate = days.toString();
        if (!isoDate.includes('T') && !isNaN(Number(days))) {
            const date = new Date();
            date.setDate(date.getDate() - Number(days));
            isoDate = date.toISOString();
        }
        qClauses.push(`modifiedTime > '${isoDate}'`);
    }

    url.searchParams.append("q", qClauses.join(" and "));

    // 2. Other Parameters
    url.searchParams.append("key", apiKey);
    
    url.searchParams.append("supportsAllDrives", "true");
    url.searchParams.append("includeItemsFromAllDrives", "true");

    if (isSearching && scope === 'global') {
        url.searchParams.append("corpora", "allDrives");
    }

    // Added createdTime to fields
    url.searchParams.append("fields", "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, iconLink, thumbnailLink)");
    
    const maxPageSize = 1000;
    const requestedLimit = limit === 'all' ? maxPageSize : Number(limit);
    const actualPageSize = Math.min(requestedLimit, maxPageSize);
    
    url.searchParams.append("pageSize", actualPageSize.toString());
    url.searchParams.append("orderBy", "folder, modifiedTime desc"); 
    
    if (pageToken) {
        url.searchParams.append("pageToken", pageToken);
    }

    // 3. Execute Fetch
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Lỗi HTTP: ${response.status}`;
        let errJson: any = null;
        
        try {
            errJson = JSON.parse(errText);
        } catch (e) { /* ignore */ }

        console.error("Drive API Error Detail:", JSON.stringify(errJson || errText, null, 2));

        if (response.status === 403) {
             const details = errJson?.error?.details || [];
             const isBlocked = details.some((d: any) => d.reason === 'API_KEY_SERVICE_BLOCKED');
             const errors = errJson?.error?.errors || [];
             const reason = errors[0]?.reason;
             const message = errJson?.error?.message;

             if (isBlocked) {
                 errMsg = "API_KEY_BLOCKED: Key bị chặn trong Google Cloud Console. Hãy vào 'APIs & Services > Credentials', sửa Key và thêm 'Google Drive API' vào danh sách được phép.";
             } else if (reason === 'dailyLimitExceededUnreg') {
                 errMsg = "Lỗi Quota: API Key đã vượt quá giới hạn truy cập.";
             } else if (reason === 'insufficientFilePermissions') {
                 errMsg = "Lỗi Quyền (403): Thư mục chưa được chia sẻ công khai (Anyone with the link).";
             } else {
                 errMsg = `Lỗi 403: ${message || "Quyền truy cập bị từ chối."}`;
             }
        } else if (response.status === 400) {
             if (errText.includes("pageToken") || errJson?.error?.errors?.[0]?.location === 'pageToken') {
                 errMsg = "Lỗi Token phân trang (Hệ thống sẽ tự làm mới...).";
             } else {
                 errMsg = `Lỗi cú pháp tìm kiếm (400): ${errJson?.error?.message || "Yêu cầu không hợp lệ"}`;
             }
        } else if (response.status === 404) {
             errMsg = "Lỗi 404: Không tìm thấy thư mục gốc hoặc ID thư mục sai.";
        }
        
        throw new Error(errMsg);
    }

    const data = await response.json();

    // 4. Map Response to App Types
    const mappedItems = (data.files || []).map((file: any) => {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        
        return {
            id: file.id,
            name: file.name,
            url: file.webViewLink,
            type: isFolder ? ItemType.FOLDER : ItemType.FILE,
            description: "", 
            tags: isFolder ? ['Thư mục'] : ['Tệp tin'],
            dateAdded: file.modifiedTime, // Last Modified
            createdTime: file.createdTime, // Created Time (New)
            mimeType: file.mimeType,
            size: file.size ? parseInt(file.size) : undefined,
            folderCount: undefined,
            fileCount: undefined
        };
    });

    return {
        items: mappedItems,
        nextPageToken: data.nextPageToken || null,
        phase: 'DONE' 
    };

  } catch (error: any) {
    console.error("API Service Error:", error);
    throw error;
  }
};
