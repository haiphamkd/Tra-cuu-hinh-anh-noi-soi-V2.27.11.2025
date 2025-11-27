
import { ApiResponse, ItemType } from "../types";

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
    
    // 1. Construct the 'q' parameter (Query Clause)
    let qClauses: string[] = ["trashed = false"];

    // -- Search vs Browse Logic --
    const isSearching = searchQuery && searchQuery.trim() !== "";
    
    if (isSearching) {
        // User is searching
        const safeQuery = searchQuery!.replace(/'/g, "\\'");
        qClauses.push(`name contains '${safeQuery}'`);
        
        // If scope is current folder only
        if (scope === 'current' && folderId) {
            qClauses.push(`'${folderId}' in parents`);
        }
    } else {
        // User is browsing (Strict Hierarchy)
        // This ensures we ONLY see direct children of the folderId
        if (folderId) {
            qClauses.push(`'${folderId}' in parents`);
        }
    }

    // -- Time Filter --
    if (days && days !== 'all') {
        let isoDate = days.toString();
        // Check if days is already an ISO string (contains 'T')
        // If it's just a number, calculate the date (fallback)
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
    
    // CRITICAL: Enable support for Team Drives / Shared Drives
    url.searchParams.append("supportsAllDrives", "true");
    url.searchParams.append("includeItemsFromAllDrives", "true");

    // FIX: Only use corpora=allDrives when searching globally (not restricted by parent)
    // Using corpora=allDrives with 'in parents' query causes 400 Bad Request
    // Only apply 'allDrives' if we are searching AND scope is global
    if (isSearching && scope === 'global') {
        url.searchParams.append("corpora", "allDrives");
    }

    // Fields: request only what we need to save bandwidth
    url.searchParams.append("fields", "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink)");
    
    // FIX: Google Drive API limits pageSize to 1000. 
    // If user requests 3000, we request 1000 per page and let the App handle pagination loops.
    const maxPageSize = 1000;
    const requestedLimit = limit === 'all' ? maxPageSize : Number(limit);
    // Use the smaller of requested limit or max API limit (1000)
    const actualPageSize = Math.min(requestedLimit, maxPageSize);
    
    url.searchParams.append("pageSize", actualPageSize.toString());
    url.searchParams.append("orderBy", "folder, modifiedTime desc"); // Folders first, then newest files
    
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

        // Log full error for debugging (Stringify to avoid [object Object])
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
             // Handle Invalid Value (often pageToken issues or query syntax)
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
            description: "", // Drive API listing doesn't return description by default efficiently
            tags: isFolder ? ['Thư mục'] : ['Tệp tin'],
            dateAdded: file.modifiedTime,
            mimeType: file.mimeType,
            size: file.size ? parseInt(file.size) : undefined,
            folderCount: undefined, // API doesn't provide this cheaply
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
