/**
 * UI helpers — panels, toasts, library rendering
 */

import { getSavedVoices, getHistory, deleteVoice } from "./storage.js";

export function showToast(message, duration = 2800) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}

export function switchPanel(panelId) {
  // Hide all panels
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.remove("active");
    p.hidden = true;
  });

  const target = document.getElementById(`panel-${panelId}`);
  if (target) {
    target.hidden = false;
    target.classList.add("active");
  }

  // Update nav states
  document.querySelectorAll(".nav-item, .bottom-item").forEach((btn) => {
    const isActive = btn.dataset.panel === panelId;
    btn.classList.toggle("active", isActive);
    if (btn.classList.contains("nav-item")) {
      btn.setAttribute("aria-current", isActive ? "page" : "false");
    }
  });

  // Scroll content to top
  const content = document.querySelector(".content");
  if (content) content.scrollTop = 0;
}

export function initNavigation() {
  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPanel(btn.dataset.panel);
    });
  });
}

export function renderLibrary() {
  const voicesEl = document.getElementById("savedVoices");
  const historyEl = document.getElementById("historyList");
  if (!voicesEl || !historyEl) return;

  const voices = getSavedVoices();
  if (voices.length === 0) {
    voicesEl.innerHTML = `<p class="list-empty">No hay voces guardadas todavía.</p>`;
  } else {
    voicesEl.innerHTML = voices
      .map(
        (v) => `
      <div class="voice-item" data-id="${v.id}">
        <div>
          <strong>${escapeHtml(v.name)}</strong>
          <div class="setting-desc">${new Date(v.createdAt).toLocaleString()}</div>
        </div>
        <button class="btn btn-sm btn-secondary delete-voice" data-id="${v.id}">Eliminar</button>
      </div>`
      )
      .join("");

    voicesEl.querySelectorAll(".delete-voice").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteVoice(btn.dataset.id);
        renderLibrary();
        showToast("Voz eliminada");
      });
    });
  }

  const history = getHistory();
  if (history.length === 0) {
    historyEl.innerHTML = `<p class="list-empty">El historial aparecerá aquí.</p>`;
  } else {
    historyEl.innerHTML = history
      .slice(0, 20)
      .map(
        (h) => `
      <div class="history-item">
        <div>
          <strong>${escapeHtml(h.type || "Generación")}</strong>
          <div class="setting-desc">${escapeHtml((h.text || "").slice(0, 80))}${(h.text || "").length > 80 ? "…" : ""}</div>
          <div class="setting-desc">${new Date(h.createdAt).toLocaleString()}</div>
        </div>
      </div>`
      )
      .join("");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
