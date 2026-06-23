export interface KBFile {
  name: string;
  path: string; // Relative to KB root — pass directly to kbFile()
  size_bytes: number;
  last_modified: string; // ISO timestamp
  is_dir: boolean;
  children?: KBFile[]; // Populated for directories
}

export interface KBFileContent {
  path: string;
  content: string;
  size_bytes: number;
  last_modified: string;
}


