
export enum ItemType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
  LINK = 'LINK'
}

export interface DirectoryItem {
  id: string;
  name: string;
  url: string;
  type: ItemType;
  description?: string;
  tags: string[];
  dateAdded: string; // This is modifiedTime
  createdTime?: string; // New field for creation time
  mimeType?: string; 
  folderCount?: number; 
  fileCount?: number;   
  size?: number;        
}

export interface ApiResponse {
  items: DirectoryItem[];
  nextPageToken?: string | null;
  phase?: 'FOLDER' | 'FILE' | 'DONE';
  error?: string;
}

export interface ImportResult {
  items: DirectoryItem[];
}
