# VoxClone v1.1

**Aplicación web moderna y profesional** para clonación de voz neural, texto a voz y voz a voz.

- HTML + CSS + JavaScript **modularizado** (ES Modules)
- Tema claro / oscuro / sistema
- Altamente responsiva + **PWA instalable**
- Soporte prioritario de **Español Mexicano y Latinoamericano**
- Arquitectura lista para **clonación neural de alta calidad**

## Idiomas / Acentos

| Código   | Descripción                  |
|----------|------------------------------|
| es-MX    | Español (México) — por defecto |
| es-419   | Español (Latinoamérica)      |
| es-AR    | Español (Argentina)          |
| es-CO    | Español (Colombia)           |
| es-CL    | Español (Chile)              |
| es-PE    | Español (Perú)               |
| es-ES    | Español (España)             |
| + en, pt-BR, fr, de            |

**Importante**: En los motores neurales (XTTS, Chatterbox…) el **acento** lo determina principalmente la **muestra de voz de referencia**. Usa un audio de un hablante mexicano para obtener un acento mexicano, aunque el idioma del modelo sea simplemente `es`.

## Motores de clonación neural

En el panel **Clonar Voz** puedes elegir:

1. **Sistema (Web Speech)** — Demo rápido, sin clonación real.
2. **Backend local** — Recomendado para máxima calidad.
   - Conecta a **Coqui XTTS v2**, **Chatterbox**, **Mimicry**, etc.
   - Endpoint esperado: `POST` multipart con `text`, `language`, `speaker_wav`.
   - Ejemplo de repos estables:
     - [Mimicry (XTTS)](https://github.com/rishav-jha-mech/mimicry)
     - [Qwen3-TTS Voice Clone](https://github.com/ammosu/qwen3-tts-voice-clone)
     - RVC-Project + XTTS wrappers
3. **Navegador (VoxShot / Transformers.js)** — 100 % client-side con WebGPU.
   - Librerías: [voxshot](https://github.com/m96-chan/voxshot), Chatterbox ONNX demos.
   - Primera carga descarga ~0.5–1.5 GB (luego cacheado).

### Recomendaciones 2026 para español latino

| Motor              | Calidad | Acento Latino | Notas |
|--------------------|---------|---------------|-------|
| **XTTS v2**        | Excelente | Muy bueno (según muestra) | Más maduro, 17 idiomas, zero-shot 6 s |
| **Chatterbox Multilingual** | Excelente | Finetunes LatAm / España | Alta naturalidad, MIT |
| **VoxShot + Chatterbox ONNX** | Muy buena | Según modelo | Corre en el navegador |
| Qwen3-TTS          | Muy buena | Bueno | Voice design + clone |

## Cómo usar

```bash
# Servir (necesario para micrófono y PWA)
npx serve voxclone
# o
python -m http.server 8080 --directory voxclone
```

1. Abre la app → panel **Clonar Voz**.
2. Elige el motor (Backend recomendado para producción).
3. Graba o sube 6–20 s de audio limpio de la voz objetivo.
4. Escribe el texto y genera.

## Estructura

```
voxclone/
├── index.html
├── css/styles.css
├── js/
│   ├── main.js
│   └── modules/
│       ├── theme.js
│       ├── storage.js
│       ├── tts.js
│       ├── recorder.js
│       ├── stt.js
│       ├── ui.js
│       └── neural.js      ← motores de clonación
├── icons/
├── manifest.json
├── sw.js
└── README.md
```

## Extender el motor del navegador

```js
// Ejemplo conceptual con voxshot (requiere npm + build o importmap)
import { VoxShot } from "voxshot";
const tts = await VoxShot.create();
await tts.cloneVoice(referenceFile);
const audio = await tts.speak("Hola, esta es mi voz clonada en español mexicano.");
await audio.play();
```

## Licencia y ética

Código libre para uso personal y educativo.  
**Solo clona voces con permiso explícito.** Respeta derechos de imagen y voz.
