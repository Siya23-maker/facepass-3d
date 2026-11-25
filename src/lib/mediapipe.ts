import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// MediaPipe needs two things:
//   - a WebAssembly (WASM) runtime: compiled C++ code that runs in the browser
//   - a model file (.task): the trained neural network weights
// We prefer local copies (offline demo); if missing, we use the online versions.

// import.meta.env.BASE_URL is "/" in development and "/facepass-3d/" on GitHub Pages.
const BASE = import.meta.env.BASE_URL
const LOCAL_WASM = `${BASE}mediapipe/wasm`
const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const LOCAL_MODEL = `${BASE}models/face_landmarker.task`
const REMOTE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

/** True if the file exists locally. (Vite answers unknown paths with index.html, so we check the type.) */
async function existsLocally(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const type = res.headers.get('content-type') ?? ''
    return res.ok && !type.includes('text/html')
  } catch {
    return false
  }
}

export interface LoadedLandmarker {
  landmarker: FaceLandmarker
  source: 'local' | 'online'
  delegate: 'GPU' | 'CPU'
}

export async function createFaceLandmarker(): Promise<LoadedLandmarker> {
  const localWasm = await existsLocally(`${LOCAL_WASM}/vision_wasm_internal.js`)
  const localModel = await existsLocally(LOCAL_MODEL)
  const fileset = await FilesetResolver.forVisionTasks(localWasm ? LOCAL_WASM : CDN_WASM)
  const modelAssetPath = localModel ? LOCAL_MODEL : REMOTE_MODEL
  const source = localWasm && localModel ? 'local' : 'online'

  const make = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: 'VIDEO', // we feed frames one by one from the webcam
      numFaces: 1, // an entrance lane serves one person at a time
      outputFaceBlendshapes: true, // expression scores, used for the blink cue
    })

  // GPU is faster; some machines/drivers refuse it, so we fall back to CPU.
  try {
    return { landmarker: await make('GPU'), source, delegate: 'GPU' }
  } catch {
    return { landmarker: await make('CPU'), source, delegate: 'CPU' }
  }
}
