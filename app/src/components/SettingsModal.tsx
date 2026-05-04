"use client";

import { useState, useEffect } from "react";
import { XIcon, FolderOpenIcon, LinkIcon, CheckIcon, SettingsIcon, CpuIcon } from "lucide-react";

interface AppSettings {
  colabUrl: string;
  workspaceDir: string;
  modelName: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  initialSettings: AppSettings;
}

export function SettingsModal({ isOpen, onClose, onSave, initialSettings }: SettingsModalProps) {
  const [colabUrl, setColabUrl] = useState("");
  const [workspaceDir, setWorkspaceDir] = useState("");
  const [modelName, setModelName] = useState("");
  const [saved, setSaved] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setColabUrl(initialSettings.colabUrl || "");
      setWorkspaceDir(initialSettings.workspaceDir || "");
      setModelName(initialSettings.modelName || "");
      setSaved(false);
    }
  }, [initialSettings, isOpen]);

  useEffect(() => {
    setIsValid(colabUrl.length > 0 && workspaceDir.length > 0 && modelName.length > 0);
  }, [colabUrl, workspaceDir, modelName]);

  const handleSelectFolder = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
        setWorkspaceDir(dirHandle.name);
      }
    } catch {
      // User cancelled
    }
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({ colabUrl, workspaceDir, modelName });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
              <LinkIcon size={14} />
              Colab Cloudflared URL
            </label>
            <input
              type="text"
              value={colabUrl}
              onChange={(e) => setColabUrl(e.target.value)}
              placeholder="https://your-tunnel.trycloudflare.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
              <CpuIcon size={14} />
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. Qwen/Qwen2.5-Coder-7B-Instruct"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
              <FolderOpenIcon size={14} />
              Workspace Folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workspaceDir}
                placeholder="Select a folder..."
                readOnly
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none cursor-default"
              />
              <button
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 cursor-pointer"
              >
                <FolderOpenIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            {saved ? (
              <>
                <CheckIcon size={16} />
                Saved
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
