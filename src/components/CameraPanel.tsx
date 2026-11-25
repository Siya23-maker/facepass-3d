import type { RefObject } from 'react'
import type { CameraStatus } from '../hooks/useFaceTracking'
import type { FaceSnapshot, GateState } from '../types'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  status: CameraStatus
  error: string | null
  modelInfo: string
  snapshot: FaceSnapshot
  gate: GateState
  awaitingBlink: boolean
  onStart: () => void
  onStop: () => void
  onSimulate: () => void
}

/** Live webcam preview with the MediaPipe face mesh drawn on top. */
export function CameraPanel(p: Props) {
  const live = p.status === 'running'
  return (
    <section className="card">
      <header className="card-head">
        <h2>Tablet camera</h2>
        <span className={`pill ${live ? 'pill-live' : p.status === 'simulated' ? 'pill-warn' : ''}`}>
          {live ? '● LIVE' : p.status === 'simulated' ? 'SIMULATED' : p.status === 'loading' ? 'STARTING…' : 'OFF'}
        </span>
      </header>

      <div className={`viewport ${p.gate === 'scanning' ? 'is-scanning' : ''} gate-${p.gate}`}>
        {/* The video and the canvas sit exactly on top of each other. Both are mirrored
            with CSS so it feels like looking in a mirror. */}
        <video ref={p.videoRef} playsInline muted className="mirror" />
        <canvas ref={p.canvasRef} className="mirror overlay" />
        <div className="corners" />
        {p.gate === 'scanning' && <div className="scanline" />}

        {p.status === 'idle' && (
          <div className="viewport-msg">
            <p>Camera is off</p>
            <button className="btn btn-primary" onClick={p.onStart}>Activate camera</button>
            <small>Frames are processed locally in this browser. Nothing is recorded or uploaded.</small>
          </div>
        )}
        {p.status === 'loading' && (
          <div className="viewport-msg">
            <div className="spinner" />
            <p>Starting camera and loading face model…</p>
          </div>
        )}
        {p.status === 'error' && (
          <div className="viewport-msg error">
            <p>⚠ {p.error}</p>
            <div className="row">
              <button className="btn btn-primary" onClick={p.onStart}>Try again</button>
              <button className="btn" onClick={p.onSimulate}>Continue without camera</button>
            </div>
          </div>
        )}
        {p.status === 'simulated' && (
          <div className="viewport-msg">
            <p>No camera: face detection is <b>simulated</b> for this demo.</p>
            <button className="btn" onClick={p.onStart}>Try real camera</button>
          </div>
        )}
        {live && !p.snapshot.faceDetected && <div className="badge-float">No face in view</div>}
        {p.awaitingBlink && <div className="badge-float blink">Please blink once</div>}
      </div>

      <div className="stats">
        <Stat label="Face" value={p.snapshot.faceDetected ? 'Detected' : '—'} ok={p.snapshot.faceDetected} />
        <Stat label="Landmarks" value={String(p.snapshot.landmarkCount || '—')} />
        <Stat label="Blinks" value={p.status === 'running' ? String(p.snapshot.blinkCount) : '—'} />
        <Stat label="FPS" value={p.snapshot.fps ? String(p.snapshot.fps) : '—'} />
      </div>
      <footer className="card-foot">
        <small>{p.modelInfo ? `MediaPipe Face Landmarker · ${p.modelInfo}` : 'MediaPipe Face Landmarker'}</small>
        {(live || p.status === 'simulated') && (
          <button className="btn btn-ghost" onClick={p.onStop}>Stop camera</button>
        )}
      </footer>
    </section>
  )
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b className={ok ? 'ok' : ''}>{value}</b>
    </div>
  )
}
