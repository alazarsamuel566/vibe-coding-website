import fs from "fs/promises";
import path from "path";
import { FileNode } from "@/types";

const BASE_DIR = path.join(process.cwd(), "..", "workspaces");

function getWorkspaceDir(workspaceDir: string): string {
  return path.resolve(BASE_DIR, workspaceDir);
}

export async function ensureWorkspace(workspaceDir: string) {
  const dir = getWorkspaceDir(workspaceDir);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function readFile(filePath: string, workspaceDir: string): Promise<string> {
  const fullPath = path.join(getWorkspaceDir(workspaceDir), filePath);
  return fs.readFile(fullPath, "utf-8");
}

export async function writeFile(
  filePath: string,
  content: string,
  workspaceDir: string
): Promise<void> {
  const fullPath = path.join(getWorkspaceDir(workspaceDir), filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
}

export async function deleteFile(filePath: string, workspaceDir: string): Promise<void> {
  const fullPath = path.join(getWorkspaceDir(workspaceDir), filePath);
  await fs.unlink(fullPath);
}

export async function listFiles(
  dirPath: string,
  workspaceDir: string
): Promise<FileNode[]> {
  const fullPath = path.join(getWorkspaceDir(workspaceDir), dirPath);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await listFiles(entryPath, workspaceDir);
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: "directory",
          children,
        });
      } else {
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: "file",
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

export async function getFileContent(filePath: string, workspaceDir: string): Promise<string> {
  const fullPath = path.join(getWorkspaceDir(workspaceDir), filePath);
  return fs.readFile(fullPath, "utf-8");
}

export async function getAllFilesContent(
  dirPath: string,
  workspaceDir: string
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const fullPath = path.join(getWorkspaceDir(workspaceDir), dirPath);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const childFiles = await getAllFilesContent(entryPath, workspaceDir);
        files.push(...childFiles);
      } else {
        if (
          !["node_modules", ".git", ".next"].some(
            (skip) => entryPath.includes(skip)
          )
        ) {
          try {
            const content = await fs.readFile(
              path.join(getWorkspaceDir(workspaceDir), entryPath),
              "utf-8"
            );
            files.push({ path: entryPath, content });
          } catch {
            // Skip binary files
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  return files;
}
