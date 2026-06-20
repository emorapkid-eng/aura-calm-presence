# Jarvis Desktop (Electron)

Windows desktop wrapper around the Jarvis frontend, designed to talk to a
local Python backend.

## Run from source

```bash
npm install
npx electron electron/main.cjs
```

## Configure

Environment variables (optional):

| Variable              | Default                                   | Purpose                            |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| `JARVIS_URL`          | hosted Lovable preview URL                | Frontend URL the window loads.     |
| `JARVIS_BACKEND_URL`  | `http://127.0.0.1:5005`                   | Python backend the renderer hits.  |

In the renderer:

```js
const backend = await window.jarvis.getBackendUrl();
const res = await fetch(`${backend}/state`);
```

## Build a Windows .exe (from Linux/macOS/Windows)

```bash
npm install --save-dev electron @electron/packager
npx @electron/packager . "Jarvis" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --ignore="^/src" --ignore="^/public" \
  --ignore="^/electron-release" --ignore="^/dist"
```

The resulting folder `electron-release/Jarvis-win32-x64/` contains
`Jarvis.exe`. Zip it and ship.
