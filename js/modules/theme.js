/**
 * Theme management — light / dark / system
 * Persists preference in localStorage
 */

const STORAGE_KEY = "voxclone-theme";

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || "system";
  applyTheme(saved);

  const select = document.getElementById("themeSelect");
  if (select) {
    select.value = saved;
    select.addEventListener("change", (e) => {
      applyTheme(e.target.value);
      localStorage.setItem(STORAGE_KEY, e.target.value);
    });
  }

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "system";
      let next;
      if (current === "light") next = "dark";
      else if (current === "dark") next = "light";
      else {
        // system → opposite of current preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        next = prefersDark ? "light" : "dark";
      }
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (select) select.value = next;
    });
  }

  // React to system changes when in "system" mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const mode = localStorage.getItem(STORAGE_KEY) || "system";
    if (mode === "system") applyTheme("system");
  });
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }

  // Update theme-color meta for browser UI
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    meta.setAttribute("content", isDark ? "#0b1120" : "#f8fafc");
  }
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || "system";
}
