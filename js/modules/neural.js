/**
 * Neural voice cloning engines for VoxClone
 * - system: Web Speech (demo)
 * - backend: self-hosted XTTS / FastAPI (see /backend)
 * - browser: VoxShot + Chatterbox ONNX (WebGPU)
 * - fakeyou: optional cloud library of community voices (rate-limited)
 */

import { speak } from "./tts.js";

let voxshotInstance = null;
let voxshotLoading = null;

async function loadVoxShot(onProgress) {
  if (voxshotInstance) return voxshotInstance;
  if (voxshotLoading) return voxshotLoading;

  voxshotLoading = (async () => {
    try {
      let VoxShot;
      try {
        const mod = await import("voxshot");
        VoxShot = mod.VoxShot || mod.default?.VoxShot || mod.default;
      } catch {
        const mod = await import("https://cdn.jsdelivr.net/npm/voxshot@0.3.0/+esm").catch(() => null);
        if (mod) VoxShot = mod.VoxShot || mod.default?.VoxShot || mod.default;
      }

      if (!VoxShot) {
        throw new Error(
          "VoxShot no está disponible. Instala: npm install voxshot @huggingface/transformers y usa un bundler (Vite). Ver README."
        );
      }

      const tts = await VoxShot.create({
        onProgress: (p) => {
          if (onProgress && p) {
            const msg = [p.status, p.file, p.progress != null ? Math.round(p.progress) + "%" : ""]
              .filter(Boolean)
              .join(" ");
            onProgress(msg);
          }
        },
      });
      voxshotInstance = tts;
      return tts;
    } catch (err) {
      voxshotLoading = null;
      throw err;
    }
  })();

  return voxshotLoading;
}

export async function generateClonedSpeech(opts) {
  const {
    text,
    sampleBlob,
    engine,
    backendUrl,
    lang,
    voiceName,
    fakeyouModelToken,
    onProgress,
  } = opts;

  if (!text?.trim()) throw new Error("Texto vacío");

  if (engine === "system") {
    await speak(text, { rate: 1, pitch: 1.04, lang: lang || "es-MX" });
    return { mode: "system", message: "Generado con síntesis del sistema (demo)" };
  }

  if (engine === "backend") {
    if (!sampleBlob) throw new Error("Se necesita una muestra de audio");
    if (!backendUrl) throw new Error("Configura la URL del backend (ej. http://localhost:8000/tts)");

    onProgress?.("Enviando a backend neural…");

    const form = new FormData();
    form.append("text", text);
    form.append("language", normalizeLang(lang));
    form.append("speaker_wav", sampleBlob, "reference.wav");
    if (voiceName) form.append("speaker_name", voiceName);

    const res = await fetch(backendUrl, { method: "POST", body: form });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error("Backend " + res.status + ": " + errText.slice(0, 240));
    }

    const contentType = res.headers.get("content-type") || "";
    let audioBlob;

    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        audioBlob = new Blob([bytes], { type: "audio/wav" });
      } else if (data.url) {
        audioBlob = await (await fetch(data.url)).blob();
      } else {
        throw new Error("JSON del backend sin campo audio/url");
      }
    } else {
      audioBlob = await res.blob();
    }

    const url = URL.createObjectURL(audioBlob);
    await new Audio(url).play();
    return { mode: "backend", url, message: "Generado con XTTS / backend neural" };
  }

  if (engine === "browser") {
    if (!sampleBlob) throw new Error("Se necesita una muestra de audio para VoxShot");

    onProgress?.("Cargando motor VoxShot (puede descargar modelos la 1ª vez)…");
    const tts = await loadVoxShot(onProgress);

    onProgress?.("Clonando voz desde la muestra…");
    const fileLike =
      sampleBlob instanceof File
        ? sampleBlob
        : new File([sampleBlob], "reference.wav", { type: sampleBlob.type || "audio/wav" });

    await tts.cloneVoice(fileLike);

    onProgress?.("Sintetizando…");
    const audioResult = await tts.speak(text);

    if (audioResult?.play) {
      await audioResult.play();
    } else if (audioResult instanceof Blob || audioResult instanceof ArrayBuffer) {
      const blob = audioResult instanceof Blob ? audioResult : new Blob([audioResult], { type: "audio/wav" });
      await new Audio(URL.createObjectURL(blob)).play();
    } else if (typeof audioResult === "string") {
      await new Audio(audioResult).play();
    }

    return { mode: "browser", message: "Generado con VoxShot (navegador)" };
  }

  if (engine === "fakeyou") {
    if (!fakeyouModelToken) {
      throw new Error(
        "Indica un model_token de FakeYou (ej. TM:xxxxxxx). Lista: https://api.fakeyou.com/tts/list"
      );
    }

    onProgress?.("Enviando a FakeYou…");

    const idempotency = crypto.randomUUID();
    const inferRes = await fetch("https://api.fakeyou.com/tts/inference", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        uuid_idempotency_token: idempotency,
        tts_model_token: fakeyouModelToken,
        inference_text: text,
      }),
    });

    if (!inferRes.ok) {
      const t = await inferRes.text().catch(() => "");
      throw new Error("FakeYou inference error: " + inferRes.status + " " + t.slice(0, 200));
    }

    const inferData = await inferRes.json();
    const jobToken = inferData?.inference_job_token || inferData?.success?.inference_job_token;
    if (!jobToken) throw new Error("FakeYou no devolvió inference_job_token");

    onProgress?.("Esperando generación FakeYou…");
    let audioPath = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const statusRes = await fetch("https://api.fakeyou.com/tts/job/" + jobToken, {
        headers: { Accept: "application/json" },
      });
      const status = await statusRes.json();
      const state = status?.state?.status || status?.status;
      if (state === "complete_success") {
        audioPath =
          status?.state?.maybe_public_bucket_wav_audio_path ||
          status?.maybe_public_bucket_wav_audio_path;
        break;
      }
      if (state === "complete_failure" || state === "dead") {
        throw new Error("FakeYou job falló");
      }
      onProgress?.("FakeYou: " + (state || "procesando") + "…");
    }

    if (!audioPath) throw new Error("Timeout esperando FakeYou");

    const audioUrl = audioPath.startsWith("http")
      ? audioPath
      : "https://storage.googleapis.com/vocodes-public" + audioPath;

    await new Audio(audioUrl).play();
    return { mode: "fakeyou", url: audioUrl, message: "Generado con FakeYou (nube)" };
  }

  throw new Error("Motor desconocido: " + engine);
}

function normalizeLang(lang) {
  if (!lang) return "es";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("de")) return "de";
  return lang.slice(0, 2);
}

export function getEngineDescription(engine) {
  const map = {
    system: "Síntesis del navegador (rápido, sin clonación real).",
    backend:
      "XTTS v2 u otro servidor local. Máxima calidad y acento latino según la muestra. Usa el backend de /backend.",
    browser:
      "VoxShot + Chatterbox ONNX en el dispositivo (WebGPU). Primera vez descarga modelos (~0.5–1.5 GB).",
    fakeyou:
      "Biblioteca pública de FakeYou (miles de voces de comunidad). Rate-limited. Solo entretenimiento; respeta derechos de las voces.",
  };
  return map[engine] || "";
}
