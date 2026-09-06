# VoxClone v1.2

Aplicación web modular (HTML/CSS/JS) para **clonación de voz neural**, TTS y voz a voz.

- Tema claro/oscuro · PWA · Responsive
- Español Mexicano / Latino por defecto
- Motores: Sistema · **Backend XTTS** · **VoxShot (navegador)** · **FakeYou**

## Motores

| Motor | Calidad | Privacidad | Notas |
|-------|---------|------------|-------|
| Sistema | Básica | Total | Demo Web Speech |
| **Backend XTTS** | Excelente | Total (local) | Recomendado. Carpeta `/backend` |
| **VoxShot** | Muy buena | Total | WebGPU, primera vez descarga modelos |
| FakeYou | Variable | Nube | Miles de voces de comunidad. Rate-limit. Solo entretenimiento |

### Acento mexicano / latino
En XTTS y VoxShot el **acento lo da la muestra de audio**. Usa 6–20 s limpios de un hablante mexicano (u otro país) para ese acento. El código de idioma suele ser solo `es`.

## Backend mínimo FastAPI + XTTS

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

En la app: motor **Backend local**, URL `http://localhost:8000/tts`.

GPU recomendada. La primera ejecución descarga XTTS v2.

## VoxShot en el frontend

Para el motor **Navegador**:

```bash
npm init -y
npm install voxshot @huggingface/transformers
# Sirve con Vite o similar para que el import "voxshot" resuelva
```

O usa el intento de carga por CDN incluido (puede fallar por CORS/versión).  
La UI muestra progreso de descarga/síntesis.

## FakeYou (como en la captura)

Sí se puede integrar algo similar a [FakeYou](https://fakeyou.com/tts):

1. Elige motor **FakeYou**.
2. Obtén un `model_token` (lista pública: `https://api.fakeyou.com/tts/list`).
3. Pégalo en el campo y genera.

**Limitaciones**: rate-limit por IP, colas, muchas voces son de celebridades/personajes (úsalo solo con fines legítimos y de entretenimiento). No es un clonador zero-shot de tu propia voz; es una biblioteca de modelos ya entrenados.

Para un clonador propio estilo FakeYou + F5-TTS zero-shot, combina el backend XTTS (o F5) con la UI de VoxClone.

## Estructura

```
voxclone/
├── index.html
├── css/styles.css
├── js/main.js
├── js/modules/
│   ├── neural.js      ← VoxShot + FakeYou + backend
│   ├── tts.js, recorder.js, stt.js, theme.js, storage.js, ui.js
├── backend/
│   ├── server.py      ← FastAPI + XTTS mínimo
│   └── requirements.txt
├── icons/, manifest.json, sw.js
└── README.md
```

## Ética

Solo clona voces con **permiso explícito**.  
FakeYou y modelos de celebridades tienen restricciones legales y de uso.
