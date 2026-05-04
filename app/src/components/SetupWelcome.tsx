"use client";

import { useState } from "react";
import { FolderOpenIcon, LinkIcon, ArrowRightIcon, Code2Icon, FolderPlusIcon, CpuIcon } from "lucide-react";

interface AppSettings {
  colabUrl: string;
  workspaceDir: string;
  modelName: string;
}

interface SetupWelcomeProps {
  onComplete: (settings: AppSettings) => void;
}

export function SetupWelcome({ onComplete }: SetupWelcomeProps) {
  const [colabUrl, setColabUrl] = useState("");
  const [workspaceDir, setWorkspaceDir] = useState("");
  const [modelName, setModelName] = useState("");
  const [step, setStep] = useState(1);

  const handleSelectFolder = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
        setWorkspaceDir(dirHandle.name);
      }
    } catch (e) {
      console.log("Folder picker cancelled");
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleStart = () => {
    onComplete({ colabUrl, workspaceDir, modelName });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-lg px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 mb-4">
            <Code2Icon size={32} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Vibe Coder</h1>
          <p className="text-zinc-500 mt-1">AI-powered IDE connected to your Colab model</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <h2 className="text-sm font-semibold text-zinc-200">Connect your model</h2>
              </div>

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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Get this URL from your Google Colab notebook after starting the cloudflared tunnel
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Continue
                <ArrowRightIcon size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h2 className="text-sm font-semibold text-zinc-200">Model name</h2>
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
                <p className="text-xs text-zinc-500 mt-2">
                  The model name your Colab server expects (must match exactly)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
                >
                  Continue
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h2 className="text-sm font-semibold text-zinc-200">Choose workspace folder</h2>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                  <FolderPlusIcon size={14} />
                  Project folder
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={workspaceDir}
                    onChange={(e) => setWorkspaceDir(e.target.value)}
                    placeholder="Type a folder name..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSelectFolder}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 cursor-pointer"
                  >
                    <FolderOpenIcon size={16} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  This is where your project files will be created and stored
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
                >
                  Start Coding
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
