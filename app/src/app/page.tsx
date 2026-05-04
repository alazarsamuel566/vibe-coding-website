"use client";

import { useState, useCallback, useEffect } from "react";
import { FileExplorer } from "@/components/FileExplorer";
import { CodeEditor } from "@/components/CodeEditor";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { SetupWelcome } from "@/components/SetupWelcome";
import { CodeAction } from "@/types";
import { AppSettings, loadSettings, saveSettings } from "@/lib/settings";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SettingsIcon,
  LinkIcon,
  FolderOpenIcon,
} from "lucide-react";
import clsx from "clsx";

export default function Home() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const stored = loadSettings();
    if (stored) {
      setSettings(stored);
    }
  }, []);

  const handleSetupComplete = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const handleSettingsSave = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const getHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
      "X-Workspace-Dir": settings?.workspaceDir || "",
      "X-Colab-Url": settings?.colabUrl || "",
      "X-Model-Name": settings?.modelName || "",
    };
  }, [settings]);

  const handleFileSelect = useCallback(
    async (filePath: string) => {
      if (hasUnsavedChanges) {
        if (!confirm("You have unsaved changes. Discard them?")) return;
      }
      setSelectedFile(filePath);
      setHasUnsavedChanges(false);

      try {
        const res = await fetch(
          `/api/files?action=read&path=${encodeURIComponent(filePath)}`,
          { headers: getHeaders() }
        );
        const data = await res.json();
        setFileContent(data.content || "");
      } catch (error) {
        console.error("Failed to read file:", error);
        setFileContent("");
      }
    },
    [hasUnsavedChanges, getHeaders]
  );

  const handleEditorChange = useCallback((content: string) => {
    setFileContent(content);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile || !hasUnsavedChanges) return;

    try {
      await fetch("/api/files", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "write",
          path: selectedFile,
          content: fileContent,
        }),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  }, [selectedFile, fileContent, hasUnsavedChanges, getHeaders]);

  const handleActions = useCallback(
    async (actions: CodeAction[]) => {
      for (const action of actions) {
        try {
          if (action.type === "create_file" && action.content !== undefined) {
            await fetch("/api/files", {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                action: "write",
                path: action.filePath,
                content: action.content,
              }),
            });
          } else if (action.type === "edit_file" && action.searchReplace) {
            const res = await fetch(
              `/api/files?action=read&path=${encodeURIComponent(action.filePath)}`,
              { headers: getHeaders() }
            );
            const data = await res.json();
            let content = data.content || "";

            for (const sr of action.searchReplace) {
              content = content.replace(sr.search, sr.replace);
            }

            await fetch("/api/files", {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                action: "write",
                path: action.filePath,
                content,
              }),
            });
          } else if (action.type === "delete_file") {
            await fetch("/api/files", {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                action: "delete",
                path: action.filePath,
              }),
            });
          }

          if (selectedFile === action.filePath) {
            const res = await fetch(
              `/api/files?action=read&path=${encodeURIComponent(action.filePath)}`,
              { headers: getHeaders() }
            );
            const data = await res.json();
            setFileContent(data.content || "");
            setHasUnsavedChanges(false);
          }
        } catch (error) {
          console.error(`Failed to execute action: ${action.type}`, error);
        }
      }
    },
    [selectedFile, getHeaders]
  );

  if (!settings?.colabUrl || !settings?.workspaceDir) {
    return <SetupWelcome onComplete={handleSetupComplete} />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <FileExplorer
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        isOpen={showExplorer}
        onToggle={() => setShowExplorer(!showExplorer)}
        headers={getHeaders()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExplorer(!showExplorer)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {showExplorer ? (
                <PanelLeftCloseIcon size={18} />
              ) : (
                <PanelLeftOpenIcon size={18} />
              )}
            </button>
            <h1 className="text-sm font-semibold text-zinc-200">Vibe Coder</h1>
            {selectedFile && (
              <span className="text-xs text-zinc-500">
                /{selectedFile}
                {hasUnsavedChanges && " *"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                <FolderOpenIcon size={12} />
                {settings.workspaceDir}
              </span>
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                <LinkIcon size={12} />
                {settings.colabUrl.replace(/^https?:\/\//, "")}
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className={clsx("flex-1 min-w-0", showChat && "w-1/2")}>
            <CodeEditor
              filePath={selectedFile}
              content={fileContent}
              onChange={handleEditorChange}
              onSave={handleSave}
            />
          </div>

          <div
            className={clsx(
              "border-l border-zinc-800 transition-all duration-200 overflow-hidden",
              showChat ? "w-[400px]" : "w-0"
            )}
          >
            <ChatPanel onAction={handleActions} headers={getHeaders()} />
          </div>
        </div>
      </div>

      {showChat && (
        <button
          onClick={() => setShowChat(false)}
          className="absolute right-4 top-12 p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <PanelRightCloseIcon size={18} />
        </button>
      )}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="absolute right-4 top-12 p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <PanelRightOpenIcon size={18} />
        </button>
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        initialSettings={settings}
      />
    </div>
  );
}
