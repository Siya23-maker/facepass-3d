import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawingUtils, FaceLandmarker } from '@mediapipe/tasks-vision'
import { createFaceLandmarker } from '../lib/mediapipe'
import type { FaceSnapshot } from '../types'

// A React "hook" is a reusable function that owns some state and side effects.
// This one owns: the webcam stream, the MediaPipe model, and the drawing loop.

export type CameraStatus = 'idle' | 'loading' | 'running' | 'error' | 'simulated'

const EMPTY: FaceSnapshot = { faceDetected: false, landmarkCount: 0, blinkCount: 0, fps: 0 }

/** Translate browser camera errors into plain language. */
function explainCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Camera permission was blocked. Click the camera icon in the address bar, allow access, then try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this computer.'
    case 'NotReadableError':
      return 'The camera is in use by another app (Teams, Zoom, etc.). Close it and try again.'
    case 'SecurityError':
      return 'The browser blocked the camera. Open the app on http://localhost, not a network address.'
    default:
      return `Could not start the face tracker: ${err instanceof Error ? err.message : String(err)}`
  }
}

export function useFaceTracking() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<string>('')
  const [snapshot, setSnapshot] = useState<FaceSnapshot>(EMPTY)

  // Refs hold values that change every frame WITHOUT re-rendering React.
  // The verification pipeline reads liveRef to get the latest face data.
  const liveRef = useRef<FaceSnapshot>({ ...EMPTY })
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const eyesClosedRef = useRef(false)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop()) // turns the camera light off
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    liveRef.current = { ...EMPTY }
    setSnapshot(EMPTY)
    setStatus('idle')
  }, [])

  /** The per-frame loop: grab frame → run model → draw mesh → update stats. */
  const loop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    if (!video || !canvas || !landmarker) return

    let lastVideoTime = -1
    let frames = 0
    let fpsWindowStart = performance.now()
    let lastUiUpdate = 0
    const ctx = canvas.getContext('2d')!
    const draw = new DrawingUtils(ctx)

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return
      lastVideoTime = video.currentTime

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const now = performance.now()
      const result = landmarker.detectForVideo(video, now)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const face = result.faceLandmarks[0]
      const live = liveRef.current
      if (face) {
        // 478 points in NORMALISED coordinates: x and y go from 0 to 1 across the image,
        // z is relative depth. DrawingUtils converts them to pixels for us.
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: 'rgba(56,189,248,0.28)', lineWidth: 0.6 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#38bdf8', lineWidth: 2 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#a7f3d0', lineWidth: 1.5 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#a7f3d0', lineWidth: 1.5 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#f0abfc', lineWidth: 1.5 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#f0abfc', lineWidth: 1.5 })
        draw.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#e2e8f0', lineWidth: 1.5 })
        draw.drawLandmarks(face, { color: '#e0f2fe', radius: 0.7, lineWidth: 0 })

        // Blink cue from blendshapes (0 = eye open, 1 = eye closed).
        const shapes = result.faceBlendshapes[0]?.categories ?? []
        const score = (n: string) => shapes.find((c) => c.categoryName === n)?.score ?? 0
        const blink = (score('eyeBlinkLeft') + score('eyeBlinkRight')) / 2
        if (blink > 0.5) eyesClosedRef.current = true
        else if (blink < 0.25 && eyesClosedRef.current) {
          eyesClosedRef.current = false
          live.blinkCount += 1 // a full close → open cycle counts as one blink
        }
      }
      live.faceDetected = !!face
      live.landmarkCount = face?.length ?? 0

      frames++
      if (now - fpsWindowStart > 1000) {
        live.fps = Math.round((frames * 1000) / (now - fpsWindowStart))
        frames = 0
        fpsWindowStart = now
      }
      // Update React only ~6 times a second; re-rendering at 30 fps would waste work.
      if (now - lastUiUpdate > 160) {
        lastUiUpdate = now
        setSnapshot({ ...live })
      }
    }
    tick()
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setStatus('loading')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera API unavailable', 'SecurityError')
      }
      // 1. Ask the browser for the webcam. This triggers the permission popup.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      // 2. Load the model once and keep it for later starts.
      if (!landmarkerRef.current) {
        const loaded = await createFaceLandmarker().catch((e) => {
          throw new Error(
            `the face model could not be loaded (${e instanceof Error ? e.message : e}). ` +
              'Connect to the internet once and run "npm run setup" so the demo works offline.',
          )
        })
        landmarkerRef.current = loaded.landmarker
        setModelInfo(`${loaded.delegate} · model ${loaded.source === 'local' ? 'local (offline)' : 'online'}`)
      }
      liveRef.current = { ...EMPTY }
      setStatus('running')
      loop()
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setError(explainCameraError(err))
      setStatus('error')
    }
  }, [loop])

  /** Fallback for a demo machine without a camera. Clearly labelled as simulated. */
  const simulate = useCallback(() => {
    stop()
    setError(null)
    liveRef.current = { faceDetected: true, landmarkCount: 478, blinkCount: 0, fps: 0 }
    setSnapshot({ ...liveRef.current })
    setStatus('simulated')
  }, [stop])

  // Clean-up when the component unmounts: always release the camera.
  useEffect(() => () => stop(), [stop])

  return { videoRef, canvasRef, status, error, modelInfo, snapshot, liveRef, start, stop, simulate }
}
