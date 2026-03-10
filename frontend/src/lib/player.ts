import type { StreamQualityMode } from "@/lib/api";

const QUALITY_PREFERENCE_KEY = "preferred-quality-mode";

export function getStoredQualityModePreference(): StreamQualityMode {
  const value = localStorage.getItem(QUALITY_PREFERENCE_KEY);
  if (value === "high" || value === "med" || value === "low" || value === "auto") {
    return value;
  }
  return "auto";
}

export function setStoredQualityModePreference(mode: StreamQualityMode) {
  localStorage.setItem(QUALITY_PREFERENCE_KEY, mode);
}
