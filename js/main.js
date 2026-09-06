/**
 * VoxClone — Main entry point
 * Modular voice cloning / TTS / STT web app
 */

import { initTheme } from "./modules/theme.js";
import {
  loadVoices,
  populateVoiceSelect,
  speak,
  stop as stopTTS,
  isSpeaking,
} from "./modules/tts.js";
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  handleFileUpload,
} from "./modules/recorder.js";
import {
  isSupported as sttSupported,
  start as startSTT,
  stop as stopSTT,
  isListening,
} from "./modules/stt.js";
import {
  getSettings,
  saveSettings,
  saveVoice,
  addHistoryItem,
  clearAllData,
} from "./modules/storage.js";
import {
  showToast,
  switchPanel,
  initNavigation,
  renderLibrary,
} from "./modules/ui.js";
import { generateClonedSpeech, getEngineDescription } from "./modules/neural.js";

// ---------- State ----------
let currentSample = null; // { blob, url, mimeType }
let deferredInstallPrompt = null;

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initNavigation();
  initPWA();
  initTTSPanel();
  initClonePanel();
  initV2VPanel();
  initSettings();
  renderLibrary();

  // Load voices
  await loadVoices();
  const settings = getSettings();
  populateVoiceSelect(document.getElementById("voiceSelect"), settings.lang);

  // Re-populate when voices change
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
      loadVoices().then(() => {
        populateVoiceSelect(document.getElementById("voiceSelect"), getSettings().lang);
      });
    };
  }

  showToast("VoxClone listo · Todo se procesa en tu dispositivo");
});

// ---------- PWA ----------
function initPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("[PWA] Service Worker registrado"))
      .catch((err) => console.warn("[PWA] SW error:", err));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById("installBtn");
    if (btn) btn.classList.remove("hidden");
  });

  document.getElementById("installBtn")?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      showToast("¡Aplicación instalada!");
    }
    deferredInstallPrompt = null;
    document.getElementById("installBtn")?.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => {
    showToast("VoxClone instalado correctamente");
    document.getElementById("installBtn")?.classList.add("hidden");
  });
}

// ---------- TTS Panel ----------
function initTTSPanel() {
  const textEl = document.getElementById("ttsText");
  const charCount = document.getElementById("ttsCharCount");
  const rateRange = document.getElementById("rateRange");
  const pitchRange = document.getElementById("pitchRange");
  const rateValue = document.getElementById("rateValue");
  const pitchValue = document.getElementById("pitchValue");
  const speakBtn = document.getElementById("ttsSpeakBtn");
  const stopBtn = document.getElementById("ttsStopBtn");

  textEl?.addEventListener("input", () => {
    charCount.textContent = textEl.value.length;
  });

  rateRange?.addEventListener("input", () => {
    rateValue.textContent = parseFloat(rateRange.value).toFixed(1);
  });
  pitchRange?.addEventListener("input", () => {
    pitchValue.textContent = parseFloat(pitchRange.value).toFixed(1);
  });

  speakBtn?.addEventListener("click", async () => {
    const text = textEl.value.trim();
    if (!text) {
      showToast("Escribe algún texto primero");
      return;
    }

    const voiceSelect = document.getElementById("voiceSelect");
    const options = {
      voiceIndex: voiceSelect ? parseInt(voiceSelect.value, 10) : 0,
      rate: parseFloat(rateRange.value),
      pitch: parseFloat(pitchRange.value),
      lang: getSettings().lang,
    };

    speakBtn.disabled = true;
    stopBtn.disabled = false;

    try {
      await speak(text, options);
      addHistoryItem({ type: "TTS", text: text.slice(0, 200) });
      renderLibrary();
    } catch (err) {
      showToast("Error al sintetizar: " + (err.message || err));
    } finally {
      speakBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  stopBtn?.addEventListener("click", () => {
    stopTTS();
    stopBtn.disabled = true;
    speakBtn.disabled = false;
  });
}

// ---------- Clone Panel ----------
function initClonePanel() {
  const recordBtn = document.getElementById("recordBtn");
  const uploadInput = document.getElementById("audioUpload");
  const statusEl = document.getElementById("recordingStatus");
  const previewEl = document.getElementById("samplePreview");
  const sampleAudio = document.getElementById("sampleAudio");
  const clearBtn = document.getElementById("clearSampleBtn");
  const voiceNameInput = document.getElementById("voiceName");
  const cloneText = document.getElementById("cloneText");
  const generateBtn = document.getElementById("cloneGenerateBtn");

  let recording = false;

  recordBtn?.addEventListener("click", async () => {
    if (recording) {
      // Stop
      try {
        const result = await stopRecording();
        currentSample = result;
        showSample(result.url);
        statusEl.textContent = "Muestra grabada correctamente";
        statusEl.classList.remove("hidden");
        generateBtn.disabled = false;
        showToast("Muestra de voz lista");
      } catch (err) {
        showToast(err.message);
      }
      recording = false;
      recordBtn.classList.remove("recording");
      recordBtn.querySelector(".record-text").textContent = "Grabar";
    } else {
      // Start
      try {
        await startRecording();
        recording = true;
        recordBtn.classList.add("recording");
        recordBtn.querySelector(".record-text").textContent = "Detener";
        statusEl.textContent = "Grabando… habla con claridad 5–20 segundos";
        statusEl.classList.remove("hidden");
        previewEl.classList.add("hidden");
      } catch (err) {
        showToast(err.message || "No se pudo acceder al micrófono");
      }
    }
  });

  uploadInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await handleFileUpload(file);
      currentSample = result;
      showSample(result.url);
      statusEl.textContent = `Archivo cargado: ${file.name}`;
      statusEl.classList.remove("hidden");
      generateBtn.disabled = false;
      showToast("Audio cargado");
    } catch (err) {
      showToast(err.message);
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (currentSample?.url) URL.revokeObjectURL(currentSample.url);
    currentSample = null;
    previewEl.classList.add("hidden");
    statusEl.classList.add("hidden");
    generateBtn.disabled = true;
    if (sampleAudio) sampleAudio.src = "";
  });

  function showSample(url) {
    if (sampleAudio) {
      sampleAudio.src = url;
      previewEl.classList.remove("hidden");
    }
  }

  const engineSelect = document.getElementById("neuralEngine");
  const backendConfig = document.getElementById("backendConfig");
  const engineHint = document.getElementById("engineHint");
  const cloneHint = document.getElementById("cloneHint");

  function updateEngineUI() {
    const eng = engineSelect?.value || "system";
    if (backendConfig) {
      backendConfig.classList.toggle("hidden", eng !== "backend");
    }
    if (engineHint) engineHint.textContent = getEngineDescription(eng);
    if (cloneHint) {
      if (eng === "system") {
        cloneHint.textContent = "Modo Sistema: síntesis del navegador (demo). Cambia a Backend para calidad neural real.";
      } else if (eng === "backend") {
        cloneHint.textContent = "Envía muestra + texto a tu servidor XTTS/Chatterbox. Asegúrate de que el endpoint acepte multipart/form-data.";
      } else {
        cloneHint.textContent = "Para motor en navegador instala VoxShot o carga Chatterbox ONNX con Transformers.js (ver README).";
      }
    }
  }

  engineSelect?.addEventListener("change", updateEngineUI);
  updateEngineUI();

  generateBtn?.addEventListener("click", async () => {
    const text = cloneText.value.trim();
    if (!text) {
      showToast("Escribe el texto a generar");
      return;
    }
    if (!currentSample && (engineSelect?.value === "backend" || engineSelect?.value === "browser")) {
      showToast("Primero captura o sube una muestra de voz");
      return;
    }

    const name = voiceNameInput.value.trim() || "Voz clonada";
    const engine = engineSelect?.value || "system";
    const backendUrl = document.getElementById("backendUrl")?.value?.trim();

    // Save voice metadata
    const voiceId = crypto.randomUUID();
    saveVoice({
      id: voiceId,
      name,
      createdAt: Date.now(),
      engine,
    });

    generateBtn.disabled = true;
    showToast(engine === "system" ? "Generando (demo sistema)…" : "Generando con motor neural…");

    try {
      const result = await generateClonedSpeech({
        text,
        sampleBlob: currentSample?.blob || null,
        engine,
        backendUrl,
        lang: getSettings().lang,
        voiceName: name,
      });

      addHistoryItem({
        type: `Clonación (${result.mode})`,
        text: text.slice(0, 200),
        voiceName: name,
      });
      renderLibrary();
      showToast(result.message || `Generado con «${name}»`);
    } catch (err) {
      showToast("Error: " + (err.message || err));
      console.error(err);
    } finally {
      generateBtn.disabled = false;
    }
  });
}

// ---------- Voice-to-Voice Panel ----------
function initV2VPanel() {
  const toggleBtn = document.getElementById("v2vToggleBtn");
  const statusEl = document.getElementById("v2vStatus");
  const transcriptEl = document.getElementById("liveTranscript");
  const waveBars = document.getElementById("waveBars");
  const speakBtn = document.getElementById("v2vSpeakBtn");
  const clearBtn = document.getElementById("v2vClearBtn");

  let fullTranscript = "";

  if (!sttSupported()) {
    statusEl.textContent = "Reconocimiento de voz no disponible en este navegador (prueba Chrome/Edge)";
    toggleBtn.disabled = true;
    return;
  }

  toggleBtn?.addEventListener("click", () => {
    if (isListening()) {
      stopSTT();
      toggleBtn.classList.remove("active");
      waveBars?.classList.remove("active");
      statusEl.textContent = "Reconocimiento detenido";
    } else {
      fullTranscript = transcriptEl.textContent || "";
      const ok = startSTT(
        getSettings().lang,
        ({ final, interim }) => {
          if (final) {
            fullTranscript += (fullTranscript ? " " : "") + final;
            transcriptEl.textContent = fullTranscript;
          } else if (interim) {
            transcriptEl.textContent = fullTranscript + (fullTranscript ? " " : "") + interim;
          }
          speakBtn.disabled = !transcriptEl.textContent.trim();
        },
        (err) => {
          console.warn(err);
          showToast("Error de reconocimiento: " + (err.error || err.message || "desconocido"));
          toggleBtn.classList.remove("active");
          waveBars?.classList.remove("active");
          statusEl.textContent = "Error — intenta de nuevo";
        },
        () => {
          toggleBtn.classList.remove("active");
          waveBars?.classList.remove("active");
          statusEl.textContent = "Reconocimiento finalizado";
        }
      );

      if (ok) {
        toggleBtn.classList.add("active");
        waveBars?.classList.add("active");
        statusEl.textContent = "Escuchando… habla ahora";
      }
    }
  });

  speakBtn?.addEventListener("click", async () => {
    const text = transcriptEl.textContent.trim();
    if (!text) return;

    const voiceSelect = document.getElementById("voiceSelect");
    try {
      await speak(text, {
        voiceIndex: voiceSelect ? parseInt(voiceSelect.value, 10) : 0,
        rate: 1,
        pitch: 1,
        lang: getSettings().lang,
      });
      addHistoryItem({ type: "Voz a Voz", text: text.slice(0, 200) });
      renderLibrary();
    } catch (err) {
      showToast("Error al reproducir");
    }
  });

  clearBtn?.addEventListener("click", () => {
    transcriptEl.textContent = "";
    fullTranscript = "";
    speakBtn.disabled = true;
  });
}

// ---------- Settings ----------
function initSettings() {
  const langSelect = document.getElementById("langSelect");
  const saveHistoryToggle = document.getElementById("saveHistoryToggle");
  const clearDataBtn = document.getElementById("clearDataBtn");

  const settings = getSettings();
  if (langSelect) langSelect.value = settings.lang;
  if (saveHistoryToggle) saveHistoryToggle.checked = settings.saveHistory;

  langSelect?.addEventListener("change", () => {
    const s = getSettings();
    s.lang = langSelect.value;
    saveSettings(s);
    populateVoiceSelect(document.getElementById("voiceSelect"), s.lang);
    showToast("Idioma actualizado");
  });

  saveHistoryToggle?.addEventListener("change", () => {
    const s = getSettings();
    s.saveHistory = saveHistoryToggle.checked;
    saveSettings(s);
  });

  clearDataBtn?.addEventListener("click", () => {
    if (confirm("¿Borrar todas las voces e historial guardados? Esta acción no se puede deshacer.")) {
      clearAllData();
      renderLibrary();
      showToast("Datos locales eliminados");
    }
  });
}
