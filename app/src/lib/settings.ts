export interface AppSettings {
  colabUrl: string;
  workspaceDir: string;
  modelName: string;
}

const SETTINGS_KEY = "vibe-coder-settings";

export function loadSettings(): AppSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETTINGS_KEY);
}
