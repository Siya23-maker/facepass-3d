// Runs automatically after `npm install` (see "postinstall" in package.json).
// It puts MediaPipe's files inside /public so the demo works WITHOUT internet:
//   1. copies the WebAssembly runtime from node_modules
//   2. downloads the face landmark model once (about 3.6 MB)
// If anything fails, the app falls back to loading these files online.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmDst = join(root, 'public', 'mediapipe', 'wasm')
const modelDir = join(root, 'public', 'models')
const modelPath = join(modelDir, 'face_landmarker.task')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

try {
  mkdirSync(wasmDst, { recursive: true })
  for (const f of readdirSync(wasmSrc)) copyFileSync(join(wasmSrc, f), join(wasmDst, f))
  console.log('[facepass] MediaPipe runtime copied to public/mediapipe/wasm')
} catch (e) {
  console.warn('[facepass] Could not copy MediaPipe runtime (will use CDN):', e.message)
}

if (existsSync(modelPath) && statSync(modelPath).size > 100_000) {
  console.log('[facepass] Face model already present')
} else {
  try {
    mkdirSync(modelDir, { recursive: true })
    const res = await fetch(MODEL_URL, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()))
    console.log('[facepass] Face model downloaded to public/models/face_landmarker.task')
  } catch (e) {
    console.warn('[facepass] Could not download face model now (app will load it online):', e.message)
  }
}
