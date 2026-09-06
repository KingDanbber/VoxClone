/**
 * Speech-to-Text using Web Speech Recognition API
 */

let recognition = null;
let isActive = false;

export function isSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognition(lang = "es-ES") {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  return recognition;
}

export function start(lang, onResult, onError, onEnd) {
  if (!isSupported()) {
    onError?.(new Error("Reconocimiento de voz no soportado en este navegador"));
    return false;
  }

  if (isActive) stop();

  recognition = createRecognition(lang);
  if (!recognition) return false;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript + " ";
      } else {
        interim += transcript;
      }
    }
    onResult?.({ final: final.trim(), interim: interim.trim() });
  };

  recognition.onerror = (e) => {
    isActive = false;
    onError?.(e);
  };

  recognition.onend = () => {
    isActive = false;
    onEnd?.();
  };

  try {
    recognition.start();
    isActive = true;
    return true;
  } catch (err) {
    onError?.(err);
    return false;
  }
}

export function stop() {
  if (recognition && isActive) {
    recognition.stop();
  }
  isActive = false;
}

export function isListening() {
  return isActive;
}
