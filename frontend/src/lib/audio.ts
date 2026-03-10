const AUDIO_PREFERENCE_KEY = "preferred-muted";

export function getStoredMutedPreference() {
  return localStorage.getItem(AUDIO_PREFERENCE_KEY) !== "false";
}

export function setStoredMutedPreference(isMuted: boolean) {
  localStorage.setItem(AUDIO_PREFERENCE_KEY, String(isMuted));
}
