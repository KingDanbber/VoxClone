"""
VoxClone — Minimal FastAPI + Coqui XTTS v2 backend
Zero-shot voice cloning endpoint compatible with the VoxClone frontend.

Requirements (GPU recommended):
  pip install fastapi uvicorn python-multipart TTS torch torchaudio soundfile

Run:
  uvicorn server:app --host 0.0.0.0 --port 8000

Endpoint used by the frontend:
  POST /tts  (multipart: text, language, speaker_wav)
"""

import io
import tempfile
import os
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import soundfile as sf
import numpy as np

app = FastAPI(title="VoxClone XTTS Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load model so the server starts even if weights are still downloading
tts_model = None


def get_model():
    global tts_model
    if tts_model is None:
        from TTS.api import TTS
        # XTTS v2 — excellent for Spanish (including Latin American via reference)
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        if hasattr(tts_model, "to"):
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tts_model = tts_model.to(device)
            print(f"[XTTS] Loaded on {device}")
    return tts_model


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "xtts_v2",
        "languages": ["es", "en", "pt", "fr", "de", "it", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"],
    }


@app.post("/tts")
async def tts(
    text: str = Form(...),
    language: str = Form("es"),
    speaker_wav: UploadFile = File(...),
):
    """
    Zero-shot voice cloning.
    - text: text to synthesize
    - language: 2-letter code (es for any Spanish variant; accent comes from the sample)
    - speaker_wav: 6–20 s clean reference audio
    """
    if not text.strip():
        raise HTTPException(400, "text is required")

    # Normalize language for XTTS
    lang = language.lower()[:2] if language else "es"
    if lang not in {
        "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru",
        "nl", "cs", "ar", "zh", "ja", "hu", "ko", "hi",
    }:
        lang = "es"

    # Save uploaded sample to temp file (XTTS expects a path)
    suffix = os.path.splitext(speaker_wav.filename or ".wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await speaker_wav.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model = get_model()
        # XTTS synthesize → list of float samples @ 24 kHz
        wav = model.tts(
            text=text,
            speaker_wav=tmp_path,
            language=lang,
        )
        samples = np.array(wav, dtype=np.float32)

        buf = io.BytesIO()
        sf.write(buf, samples, 24000, format="WAV")
        buf.seek(0)

        return Response(
            content=buf.read(),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=cloned.wav"},
        )
    except Exception as e:
        raise HTTPException(500, f"XTTS error: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.get("/")
def root():
    return {
        "message": "VoxClone XTTS backend",
        "docs": "/docs",
        "health": "/health",
        "tts": "POST /tts (multipart: text, language, speaker_wav)",
    }
