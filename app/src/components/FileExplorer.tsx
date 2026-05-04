"use client";

import { useState, useEffect, useCallback } from "react";
import { FileNode } from "@/types";
import { FolderIcon, FolderOpenIcon, FileIcon, ChevronRightIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import clsx from "clsx";

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  isOpen: boolean;
  onToggle: () => void;
  headers?: Record<string, string>;
}

export function FileExplorer({ onFileSelect, selectedFile, isOpen, onToggle, headers = {} }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [loading, setLoading] = useState(false);

  const fetchFileTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files?action=list", { headers });
      const data = await res.json();
      setFileTree(data.tree || []);
    } catch (error) {
      console.error("Failed to fetch file tree:", error);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (isOpen) {
      fetchFileTree();
    }
  }, [isOpen, fetchFileTree]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const renderTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = selectedFile === node.path;

      if (node.type === "directory") {
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleFolder(node.path)}
              className="flex items-center w-full px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800/50 rounded"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <span className="mr-1">
                {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              </span>
              {isExpanded ? (
                <FolderOpenIcon size={14} className="text-blue-400 mr-1.5" />
              ) : (
                <FolderIcon size={14} className="text-blue-400 mr-1.5" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <button
          key={node.path}
          onClick={() => onFileSelect(node.path)}
          className={clsx(
            "flex items-center w-full px-2 py-1 text-sm hover:bg-zinc-800/50 rounded",
            isSelected ? "bg-zinc-800 text-white" : "text-zinc-400"
          )}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <FileIcon size={14} className="text-zinc-500 mr-1.5" />
          <span className="truncate">{node.name}</span>
        </button>
      );
    });
  };

  return (
    <div
      className={clsx(
        "bg-zinc-900 border-r border-zinc-800 transition-all duration-200 overflow-hidden",
        isOpen ? "w-64" : "w-0"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <button
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
        >
          <RefreshCwIcon size={16} />
        </button>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</h2>
        <button
          onClick={fetchFileTree}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
        >
          <RefreshCwIcon size={16} className={clsx(loading && "animate-spin")} />
        </button>
      </div>
      <div className="p-2 overflow-y-auto h-[calc(100vh-48px)]">
        {loading ? (
          <div className="text-zinc-500 text-sm text-center py-4">Loading...</div>
        ) : fileTree.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-4">Empty workspace</div>
        ) : (
          renderTree(fileTree)
        )}
      </div>
    </div>
  );
}
