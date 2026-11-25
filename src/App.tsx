import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraPanel } from './components/CameraPanel'
import { AccountPanel, ActivityLog, ConceptsPanel, GatePanel, PipelinePanel } from './components/Panels'
import { SCENARIOS } from './data/members'
import { useAccessController } from './hooks/useAccessController'
import { useFaceTracking } from './hooks/useFaceTracking'
import type { Waypoint } from './scene/Character'
import { GymScene } from './scene/GymScene'
import { FACEPASS_LANE_X, SCAN_SPOT, type Zone } from './scene/helpers'

// App is the top-level component. It connects the three parts:
//   camera (useFaceTracking) → decisions (useAccessController) → 3D world (GymScene)

type Tour = 'off' | 'walking' | 'scanning' | 'entering'

const JOURNEY = [
  { title: 'Arrive', text: 'The member arrives at the club with their gym bag and laptop bag.' },
  { title: 'Go to the tablet', text: 'Inside the door, they walk to the FacePass tablet on the entrance counter.' },
  { title: 'Face scan', text: 'They look at the tablet and blink. FacePass checks who they are and whether their account is eligible.' },
  { title: 'Turnstile opens', text: 'Eligible members see a green tick and the turnstile unlocks. No phone needed.' },
  { title: 'Train', text: 'The member is on the gym floor. The entry is recorded in the activity log.' },
]

export default function App() {
  const cam = useFaceTracking()
  const access = useAccessController(cam.liveRef)
  const [zone, setZone] = useState<Zone>('outside')
  const [resetToken, setResetToken] = useState(0)
  const [showLabels, setShowLabels] = useState(true)
  const [tour, setTour] = useState<Tour>('off')
  const autopilotRef = useRef<Waypoint[]>([])
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  useEffect(() => setVideoEl(cam.videoRef.current), [cam.videoRef])

  const atScanner = zone === 'scanner'
  const cameraReady = cam.status === 'running' || cam.status === 'simulated'
  const busy = access.gate === 'scanning'
  const canScan = cameraReady && atScanner && !busy && access.gate !== 'open'
  const scanHint = !cameraReady
    ? 'Activate the camera first (or press ▶ Guided demo).'
    : !atScanner
      ? 'Walk the member to the STAND HERE marker beside the tablet.'
      : access.gate === 'open'
        ? 'Turnstile is unlocked. Walk through.'
        : ''

  const scenario = SCENARIOS.find((s) => s.id === access.scenarioId)!
  const currentMember = access.members.find((m) => m.id === scenario.simulatedMatch.memberId) ?? null

  const { reset: resetAccess, scan } = access
  const resetDemo = useCallback(() => {
    autopilotRef.current = []
    setTour('off')
    resetAccess()
    setResetToken((n) => n + 1)
  }, [resetAccess])

  // ---- guided demo ("autopilot") --------------------------------------------------
  const startTour = useCallback(() => {
    resetDemo()
    if (cam.status !== 'running') cam.simulate() // keeps the demo working without a webcam
    autopilotRef.current = [
      { x: 0, z: 2.6 },
      { x: 0, z: -1.6 },
      { x: SCAN_SPOT.x, z: -4.2 },
      { x: SCAN_SPOT.x, z: SCAN_SPOT.z },
    ]
    setTour('walking')
  }, [resetDemo, cam])

  const stopTour = useCallback(() => {
    autopilotRef.current = []
    setTour('off')
  }, [])

  // When the member reaches the tablet during the tour, start the scan automatically.
  useEffect(() => {
    if (tour !== 'walking' || !atScanner) return
    const timer = window.setInterval(() => {
      if (autopilotRef.current.length === 0) {
        window.clearInterval(timer)
        setTour('scanning')
        window.setTimeout(() => scan(cam.status === 'simulated'), 700)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [tour, atScanner, scan, cam.status])

  // After the result: walk through if granted, stop if denied.
  useEffect(() => {
    if (tour !== 'scanning') return
    if (access.gate === 'open') {
      const t = window.setTimeout(() => {
        autopilotRef.current = [
          { x: FACEPASS_LANE_X, z: -6.4 },
          { x: FACEPASS_LANE_X, z: -8.4 },
          { x: 0.5, z: -11 },
        ]
        setTour('entering')
      }, 1600)
      return () => window.clearTimeout(t)
    }
    if (access.gate === 'denied') setTour('off')
  }, [tour, access.gate])

  useEffect(() => {
    if (tour === 'entering' && zone === 'inside') {
      const t = window.setTimeout(() => setTour('off'), 2500)
      return () => window.clearTimeout(t)
    }
  }, [tour, zone])

  // ---- where are we in the member journey? ------------------------------------------
  const stepIndex =
    zone === 'inside'
      ? 4
      : access.gate === 'open'
        ? 3
        : atScanner || busy || access.gate === 'denied'
          ? 2
          : zone === 'lobby'
            ? 1
            : 0
  const denied = access.gate === 'denied'
  const caption = denied
    ? `Access paused: ${access.decision?.title ?? ''}. The turnstile stays locked, the member sees why, and can use the app or reception.`
    : JOURNEY[stepIndex].text

  const banner =
    access.gate === 'open'
      ? { cls: 'granted', text: 'ACCESS GRANTED', sub: access.decision?.notice ?? 'Eligible to enter · walk through' }
      : denied
        ? { cls: 'denied', text: 'ACCESS DENIED', sub: access.decision?.title ?? '' }
        : busy
          ? { cls: 'scanning', text: access.awaitingBlink ? 'BLINK ONCE' : 'VERIFYING…', sub: 'Look at the tablet on the counter' }
          : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◉</span>
          <b>Face<span>Pass</span></b>
          <small>Club entrance · proof of concept</small>
        </div>
        <div className="badges">
          <span className="pill">LOCAL ONLY</span>
          <span className="pill">SYNTHETIC MEMBERS</span>
          <span className="pill pill-warn">RECOGNITION SIMULATED</span>
          {tour === 'off' ? (
            <button className="btn btn-primary" onClick={startTour}>▶ Guided demo</button>
          ) : (
            <button className="btn" onClick={stopTour}>■ Stop demo</button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowLabels((v) => !v)}>
            {showLabels ? 'Hide labels' : 'Show labels'}
          </button>
          <button className="btn btn-ghost" onClick={resetDemo}>↺ Reset</button>
        </div>
      </header>

      <main className="layout">
        <aside className="col">
          <CameraPanel
            videoRef={cam.videoRef}
            canvasRef={cam.canvasRef}
            status={cam.status}
            error={cam.error}
            modelInfo={cam.modelInfo}
            snapshot={cam.snapshot}
            gate={access.gate}
            awaitingBlink={access.awaitingBlink}
            onStart={cam.start}
            onStop={cam.stop}
            onSimulate={cam.simulate}
          />
          <PipelinePanel
            steps={access.steps}
            scenarioId={access.scenarioId}
            onScenario={access.setScenarioId}
            onScan={() => access.scan(cam.status === 'simulated')}
            canScan={canScan}
            scanHint={scanHint}
            busy={busy}
          />
          <ConceptsPanel />
        </aside>

        <section className="stage">
          <GymScene
            gate={access.gate}
            decision={access.decision}
            awaitingBlink={access.awaitingBlink}
            video={videoEl}
            cameraLive={cam.status === 'running'}
            showLabels={showLabels}
            zone={zone}
            resetToken={resetToken}
            autopilotRef={autopilotRef}
            onManualMove={stopTour}
            onZoneChange={setZone}
            onPassedGate={access.onPassedGate}
          />
          {banner && (
            <div className={`banner banner-${banner.cls}`}>
              <b>{banner.text}</b>
              <span>{banner.sub}</span>
            </div>
          )}
          <div className="journey">
            <ol>
              {JOURNEY.map((s, i) => (
                <li
                  key={s.title}
                  className={i < stepIndex ? 'done' : i === stepIndex ? (denied ? 'current denied' : 'current') : ''}
                >
                  <span>{i < stepIndex ? '✓' : i + 1}</span>
                  {s.title}
                </li>
              ))}
            </ol>
            <p>{caption}</p>
          </div>
          <div className="keys">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows to walk
          </div>
        </section>

        <aside className="col">
          <GatePanel gate={access.gate} decision={access.decision} onManual={access.manualAccess} />
          <AccountPanel member={currentMember} onStatus={access.setMemberStatus} />
          <ActivityLog log={access.log} />
        </aside>
      </main>
    </div>
  )
}
