/**
 * Text-to-Speech using Web Speech API
 */

let voices = [];
let currentUtterance = null;

export function loadVoices() {
  return new Promise((resolve) => {
    const populate = () => {
      voices = speechSynthesis.getVoices().sort((a, b) => {
        // Prefer local voices and matching language
        if (a.localService !== b.localService) return a.localService ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      resolve(voices);
    };

    populate();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populate;
    }
    // Fallback timeout
    setTimeout(populate, 500);
  });
}

export function getVoices() {
  return voices;
}

export function populateVoiceSelect(selectEl, preferredLang = "es-ES") {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  const filtered = voices.length
    ? voices
    : [{ name: "Voz del sistema", lang: preferredLang, default: true }];

  // Group by language roughly
  filtered.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})${v.localService ? " · local" : ""}`;
    if (v.default || v.lang.startsWith(preferredLang.slice(0, 2))) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!text?.trim()) {
      reject(new Error("Texto vacío"));
      return;
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    if (options.voiceIndex != null && voices[options.voiceIndex]) {
      utterance.voice = voices[options.voiceIndex];
    }
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.lang = options.lang || "es-ES";

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };
    utterance.onerror = (e) => {
      currentUtterance = null;
      reject(e.error || new Error("Error de síntesis"));
    };

    // Chrome has a ~15s limit per utterance → split long texts
    const chunks = splitText(text, 180);
    if (chunks.length === 1) {
      speechSynthesis.speak(utterance);
    } else {
      speakChunks(chunks, options).then(resolve).catch(reject);
    }
  });
}

function splitText(text, maxLen) {
  const sentences = text.match(/[^.!?…]+[.!?…]*/g) || [text];
  const chunks = [];
  let current = "";

  for (const s of sentences) {
    if ((current + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function speakChunks(chunks, options) {
  for (const chunk of chunks) {
    await new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (options.voiceIndex != null && voices[options.voiceIndex]) {
        u.voice = voices[options.voiceIndex];
      }
      u.rate = options.rate ?? 1;
      u.pitch = options.pitch ?? 1;
      u.lang = options.lang || "es-ES";
      u.onend = resolve;
      u.onerror = (e) => reject(e.error);
      speechSynthesis.speak(u);
    });
  }
}

export function stop() {
  speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking() {
  return speechSynthesis.speaking;
}
