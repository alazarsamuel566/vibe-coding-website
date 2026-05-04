"use client";

import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  filePath: string | null;
  content: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function CodeEditor({ filePath, content, onChange, onSave }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const getLanguage = (path: string | null) => {
    if (!path) return "plaintext";
    const ext = path.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      yml: "yaml",
      yaml: "yaml",
      xml: "xml",
      rs: "rust",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      rb: "ruby",
      php: "php",
      sh: "shell",
      sql: "sql",
    };
    return langMap[ext || ""] || "plaintext";
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {filePath ? (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-sm text-zinc-300 font-mono">{filePath}</span>
            <span className="text-xs text-zinc-500">Ctrl+S to save</span>
          </div>
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            value={content}
            onChange={(value) => onChange(value || "")}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: true,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              padding: { top: 12, bottom: 12 },
            }}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-600">
          <div className="text-center">
            <p className="text-lg">Select a file to start editing</p>
            <p className="text-sm mt-2">Or ask the AI to create one for you</p>
          </div>
        </div>
      )}
    </div>
  );
}
