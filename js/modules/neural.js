/**
 * Neural voice cloning engines
 * - system: Web Speech (demo)
 * - backend: self-hosted XTTS / Chatterbox / Mimicry style API
 * - browser: placeholder + guidance for VoxShot / Transformers.js
 */

import { speak } from "./tts.js";
import { getSettings } from "./storage.js";

/**
 * Generate cloned speech according to selected engine
 * @param {Object} opts
 * @param {string} opts.text
 * @param {Blob|null} opts.sampleBlob
 * @param {string} opts.engine  'system' | 'backend' | 'browser'
 * @param {string} opts.backendUrl
 * @param {string} opts.lang
 * @param {string} opts.voiceName
 */
export async function generateClonedSpeech(opts) {
  const { text, sampleBlob, engine, backendUrl, lang, voiceName } = opts;

  if (!text?.trim()) throw new Error("Texto vacío");

  if (engine === "system") {
    // Demo mode — system TTS with slight pitch variation
    await speak(text, {
      rate: 1,
      pitch: 1.04,
      lang: lang || "es-MX",
    });
    return { mode: "system", message: "Generado con síntesis del sistema (demo)" };
  }

  if (engine === "backend") {
    if (!sampleBlob) throw new Error("Se necesita una muestra de audio para el backend neural");
    if (!backendUrl) throw new Error("Configura la URL del backend");

    const form = new FormData();
    form.append("text", text);
    form.append("language", normalizeLang(lang));
    form.append("speaker_wav", sampleBlob, "reference.wav");
    // Common optional fields used by many XTTS / Gradio wrappers
    form.append("speaker_name", voiceName || "cloned");

    const res = await fetch(backendUrl, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Backend error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let audioBlob;

    if (contentType.includes("application/json")) {
      // Some APIs return { audio: base64 } or { url }
      const data = await res.json();
      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        audioBlob = new Blob([bytes], { type: "audio/wav" });
      } else if (data.url) {
        const audioRes = await fetch(data.url);
        audioBlob = await audioRes.blob();
      } else {
        throw new Error("Respuesta JSON del backend no contiene audio");
      }
    } else {
      // Direct audio response (most common)
      audioBlob = await res.blob();
    }

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    await audio.play();

    return { mode: "backend", url, message: "Generado con motor neural (backend)" };
  }

  if (engine === "browser") {
    // Real browser neural requires loading large models (VoxShot / Chatterbox ONNX).
    // We provide a clear path and fallback guidance.
    throw new Error(
      "Motor Navegador: carga VoxShot o Transformers.js + Chatterbox ONNX. " +
      "Ver README para integración. Por ahora usa Backend local (XTTS) o Sistema."
    );
  }

  throw new Error("Motor desconocido");
}

function normalizeLang(lang) {
  if (!lang) return "es";
  // XTTS and most neural models use 2-letter or specific codes
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("de")) return "de";
  return lang.slice(0, 2);
}

export function getEngineDescription(engine) {
  const map = {
    system: "Síntesis del navegador (rápido, calidad limitada, sin clonación real).",
    backend:
      "Conecta a un servidor local con XTTS v2, Chatterbox o Mimicry. Mejor calidad y acento latino según la muestra.",
    browser:
      "Modelos ONNX en el dispositivo (VoxShot / Transformers.js). Requiere WebGPU y descarga de ~0.5–1.5 GB la primera vez.",
  };
  return map[engine] || "";
}
