# VoxClone

**Aplicación web moderna y profesional** para clonación de voz, texto a voz (TTS) y voz a voz.

- HTML + CSS + JavaScript **modularizado** (ES Modules)
- Tema claro / oscuro / sistema
- Altamente responsiva (móvil, tablet, escritorio)
- **PWA instalable** (funciona offline después de la primera carga)
- 100 % client-side en modo demo

## Características

| Módulo        | Descripción |
|---------------|-------------|
| **Texto a Voz** | Síntesis con Web Speech API, control de velocidad y tono, selección de voces |
| **Clonar Voz**  | Grabación o subida de muestra + generación (demo con síntesis del sistema) |
| **Voz a Voz**   | Reconocimiento continuo + resíntesis |
| **Biblioteca**  | Voces guardadas e historial local (IndexedDB / localStorage) |
| **Ajustes**     | Tema, idioma, borrar datos |

## Cómo usar

1. Abre `index.html` en un navegador moderno (Chrome, Edge, Brave recomendados).
2. O sirve la carpeta con cualquier servidor estático:
   ```bash
   npx serve .
   # o
   python -m http.server 8080
   ```
3. En móvil/escritorio verás el botón **Instalar** para añadirla como PWA.

> **Importante**: La clonación neural real (XTTS, Chatterbox, VoxShot, RVC…) requiere modelos pesados. Esta app incluye una interfaz profesional lista y un modo demo funcional. Para producción puedes conectar el frontend a un backend (FastAPI + Coqui XTTS) o cargar modelos vía Transformers.js / ONNX en el navegador.

## Estructura modular

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
│       └── ui.js
├── icons/
├── manifest.json
├── sw.js
└── README.md
```

## Extender con modelos reales

- **Browser-first**: integra [voxshot](https://github.com/m96-chan/voxshot) o Transformers.js + Chatterbox.
- **Backend**: usa repositorios estables como Mimicry (XTTS), Qwen3-TTS Voice Clone o RVC-Project y expón un endpoint REST que el frontend llame.

## Licencia

Código de ejemplo libre para uso personal y educativo. Respeta siempre los derechos de las voces que clones.
