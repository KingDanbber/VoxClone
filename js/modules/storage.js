/**
 * Local storage helpers for voices & history
 */

const VOICES_KEY = "voxclone-voices";
const HISTORY_KEY = "voxclone-history";
const SETTINGS_KEY = "voxclone-settings";

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
      saveHistory: true,
      lang: "es-MX",
    };
  } catch {
    return { saveHistory: true, lang: "es-MX" };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSavedVoices() {
  try {
    return JSON.parse(localStorage.getItem(VOICES_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveVoice(voice) {
  const list = getSavedVoices();
  // voice = { id, name, createdAt, sampleDataUrl? }
  list.unshift(voice);
  // Keep max 20
  if (list.length > 20) list.length = 20;
  localStorage.setItem(VOICES_KEY, JSON.stringify(list));
  return list;
}

export function deleteVoice(id) {
  const list = getSavedVoices().filter((v) => v.id !== id);
  localStorage.setItem(VOICES_KEY, JSON.stringify(list));
  return list;
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function addHistoryItem(item) {
  const settings = getSettings();
  if (!settings.saveHistory) return getHistory();

  const list = getHistory();
  list.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...item,
  });
  if (list.length > 50) list.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  return list;
}

export function clearAllData() {
  localStorage.removeItem(VOICES_KEY);
  localStorage.removeItem(HISTORY_KEY);
}
