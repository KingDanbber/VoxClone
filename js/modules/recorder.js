/**
 * Audio recording with MediaRecorder
 */

let mediaRecorder = null;
let chunks = [];
let stream = null;

export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Tu navegador no soporta grabación de audio");
  }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  chunks = [];
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : "audio/mp4";

  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start(100); // collect every 100ms
  return mediaRecorder;
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("No hay grabación activa"));
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      const url = URL.createObjectURL(blob);
      cleanup();
      resolve({ blob, url, mimeType: mediaRecorder.mimeType });
    };

    mediaRecorder.stop();
  });
}

export function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  cleanup();
}

function cleanup() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  mediaRecorder = null;
  chunks = [];
}

export function isRecording() {
  return mediaRecorder && mediaRecorder.state === "recording";
}

/**
 * Read uploaded file as object URL + blob
 */
export function handleFileUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("audio/")) {
      reject(new Error("Selecciona un archivo de audio válido"));
      return;
    }
    const url = URL.createObjectURL(file);
    resolve({ blob: file, url, mimeType: file.type, name: file.name });
  });
}
