export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actions?: CodeAction[];
}

export interface CodeAction {
  type: "create_file" | "edit_file" | "delete_file";
  filePath: string;
  content?: string;
  searchReplace?: {
    search: string;
    replace: string;
  }[];
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

export interface ChatResponse {
  message: string;
  actions: CodeAction[];
}
