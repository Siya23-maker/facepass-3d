import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Decision, GateState } from '../types'
import {
  BRAND_RED,
  FACEPASS_LANE_X,
  FONT,
  GATE_COLORS,
  makeCanvasTexture,
  SCAN_SPOT,
  TABLET_POS,
  TURNSTILE_Z,
} from './helpers'

// The access-control hardware inside the lobby:
//   - a row of stainless-steel tripod turnstiles (lane 1 = FacePass lane)
//   - the entrance counter, with the FacePass tablet sitting on it

const CABINET_XS = [-2.2, -1.2, -0.2, 0.8] // lanes are the gaps between cabinets

const steelMat = () => <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.22} />

// ---------------------------------------------------------------------------
// Turnstiles
// ---------------------------------------------------------------------------
export function Turnstiles({ state }: { state: GateState }) {
  const lampTex = useMemo(() => {
    const color = GATE_COLORS[state]
    return makeCanvasTexture(128, 128, (c) => {
      c.fillStyle = '#09090b'
      c.fillRect(0, 0, 128, 128)
      c.strokeStyle = color
      c.fillStyle = color
      c.lineWidth = 16
      c.lineCap = 'round'
      if (state === 'open') {
        // arrow pointing "forward"
        c.beginPath()
        c.moveTo(64, 104)
        c.lineTo(64, 30)
        c.moveTo(34, 58)
        c.lineTo(64, 28)
        c.lineTo(94, 58)
        c.stroke()
      } else if (state === 'scanning') {
        c.beginPath()
        c.arc(64, 64, 34, 0, Math.PI * 1.5)
        c.stroke()
      } else {
        c.beginPath()
        c.moveTo(36, 36)
        c.lineTo(92, 92)
        c.moveTo(92, 36)
        c.lineTo(36, 92)
        c.stroke()
      }
    })
  }, [state])

  const qrTex = useMemo(
    () =>
      makeCanvasTexture(128, 128, (c) => {
        c.fillStyle = '#09090b'
        c.fillRect(0, 0, 128, 128)
        c.fillStyle = '#60a5fa'
        c.font = `700 30px ${FONT}`
        c.textAlign = 'center'
        c.fillText('APP', 64, 58)
        c.fillText('QR', 64, 92)
      }),
    [],
  )

  return (
    <group>
      {CABINET_XS.map((x, i) => (
        <group key={x} position={[x, 0, TURNSTILE_Z]}>
          {/* stainless cabinet */}
          <mesh position-y={0.47} castShadow receiveShadow>
            <boxGeometry args={[0.26, 0.94, 0.9]} />
            {steelMat()}
          </mesh>
          {/* slanted black glass top */}
          <mesh position={[0, 0.97, 0.05]} rotation-x={-0.18}>
            <boxGeometry args={[0.27, 0.04, 0.82]} />
            <meshStandardMaterial color="#09090b" metalness={0.5} roughness={0.15} />
          </mesh>
          {/* status lamp facing the lobby: FacePass lane shows ✕ / ↑, others are app lanes */}
          <mesh position={[0, 0.995, 0.3]} rotation-x={-Math.PI / 2 - 0.18}>
            <planeGeometry args={[0.16, 0.16]} />
            <meshBasicMaterial map={i === 2 ? lampTex : qrTex} toneMapped={false} />
          </mesh>
          {/* tripod arms on the right-hand side of every cabinet except the last */}
          {i < 3 && <Tripod spinning={i === 2} state={state} />}
        </group>
      ))}
      {/* glass barrier from the left wall up to the first cabinet */}
      <mesh position={[(-8.9 - 2.33) / 2, 0.6, TURNSTILE_Z]}>
        <boxGeometry args={[8.9 - 2.33, 1.1, 0.03]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh position={[(-8.9 - 2.33) / 2, 1.16, TURNSTILE_Z]}>
        <boxGeometry args={[8.9 - 2.33, 0.04, 0.05]} />
        {steelMat()}
      </mesh>
      {/* glowing strip on the floor of the FacePass lane */}
      <mesh rotation-x={-Math.PI / 2} position={[FACEPASS_LANE_X, 0.012, TURNSTILE_Z]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color={GATE_COLORS[state]} emissive={GATE_COLORS[state]} emissiveIntensity={0.5} transparent opacity={0.45} />
      </mesh>
      <pointLight position={[FACEPASS_LANE_X, 1.4, TURNSTILE_Z + 0.6]} color={GATE_COLORS[state]} intensity={3} distance={3} />
      <FloorMarker />
    </group>
  )
}

/**
 * Three steel arms on a tilted hub. When the FacePass lane unlocks, the arms turn
 * 60° so no arm blocks the lane; after the member passes they finish the turn (120°)
 * and lock again with a fresh arm across the lane.
 */
function Tripod({ spinning, state }: { spinning: boolean; state: GateState }) {
  const spin = useRef<THREE.Group>(null!)
  const base = useRef(0)
  const target = useRef(0)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!spinning) return
    if (state === 'open') {
      target.current = base.current + Math.PI / 3
      wasOpen.current = true
    } else if (wasOpen.current) {
      base.current += (Math.PI * 2) / 3
      target.current = base.current
      wasOpen.current = false
    }
  }, [state, spinning])

  useFrame((_, dt) => {
    // ease towards the target angle (frame-rate independent)
    spin.current.rotation.z = THREE.MathUtils.lerp(spin.current.rotation.z, target.current, 1 - Math.exp(-7 * dt))
  })

  return (
    <group position={[0.15, 0.86, 0.05]} rotation-x={-0.55}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 20]} />
        {steelMat()}
      </mesh>
      <group ref={spin}>
        {[0, 1, 2].map((k) => (
          <group key={k} rotation-z={(k * Math.PI * 2) / 3}>
            <mesh position-x={0.27} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.5, 10]} />
              {steelMat()}
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function FloorMarker() {
  const tex = useMemo(
    () =>
      makeCanvasTexture(512, 384, (c) => {
        c.strokeStyle = BRAND_RED
        c.lineWidth = 10
        c.setLineDash([28, 16])
        c.strokeRect(10, 10, 492, 364)
        c.setLineDash([])
        c.fillStyle = BRAND_RED
        for (const x of [196, 316]) {
          c.beginPath()
          c.ellipse(x, 150, 36, 68, 0, 0, Math.PI * 2)
          c.fill()
        }
        c.textAlign = 'center'
        c.font = `700 44px ${FONT}`
        c.fillText('STAND HERE', 256, 290)
        c.font = `500 30px ${FONT}`
        c.fillText('look at the tablet →', 256, 335)
      }),
    [],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} position={[SCAN_SPOT.x, 0.015, SCAN_SPOT.z]}>
      <planeGeometry args={[0.95, 0.71]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Entrance counter + FacePass tablet
// ---------------------------------------------------------------------------

/** Break a sentence into lines that fit a given width on the canvas. */
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (c.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

interface TabletProps {
  state: GateState
  decision: Decision | null
  awaitingBlink: boolean
  video: HTMLVideoElement | null
  cameraLive: boolean
}

export function EntranceCounter(props: TabletProps) {
  return (
    <group>
      {/* counter body: white with a red stripe facing the lobby */}
      <mesh position={[1.7, 0.52, -6.1]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.04, 3.4]} />
        <meshStandardMaterial color="#fafafa" roughness={0.5} />
      </mesh>
      <mesh position={[0.995, 0.75, -6.1]}>
        <boxGeometry args={[0.02, 0.12, 3.4]} />
        <meshStandardMaterial color={BRAND_RED} />
      </mesh>
      <mesh position={[1.7, 1.06, -6.1]} castShadow>
        <boxGeometry args={[1.5, 0.05, 3.5]} />
        <meshStandardMaterial color="#27272a" roughness={0.25} metalness={0.2} />
      </mesh>
      {/* staff monitor, facing the receptionist */}
      <group position={[2.15, 1.08, -5.0]} rotation-y={Math.PI / 2}>
        <mesh position-y={0.1}>
          <boxGeometry args={[0.06, 0.2, 0.06]} />
          <meshStandardMaterial color="#27272a" />
        </mesh>
        <mesh position-y={0.32} rotation-y={Math.PI}>
          <boxGeometry args={[0.55, 0.34, 0.03]} />
          <meshStandardMaterial color="#09090b" />
        </mesh>
      </group>
      <Tablet {...props} />
    </group>
  )
}

function Tablet({ state, decision, awaitingBlink, video, cameraLive }: TabletProps) {
  const color = GATE_COLORS[state]

  // Status screen painted on a canvas. useMemo re-paints only when the inputs change.
  const screen = useMemo(() => {
    return makeCanvasTexture(600, 420, (c) => {
      c.fillStyle = '#0a0a0a'
      c.fillRect(0, 0, 600, 420)
      // header bar
      c.fillStyle = BRAND_RED
      c.fillRect(0, 0, 600, 46)
      c.fillStyle = '#fff'
      c.font = `700 26px ${FONT}`
      c.textAlign = 'left'
      c.fillText('FacePass', 18, 32)
      c.textAlign = 'right'
      c.font = `500 20px ${FONT}`
      c.fillText('Members entrance', 582, 31)
      // camera area frame (the live video is drawn on top of this in 3D)
      c.strokeStyle = state === 'locked' ? '#52525b' : color
      c.lineWidth = 6
      c.strokeRect(150, 62, 300, 225)
      if (!cameraLive) {
        c.strokeStyle = '#71717a'
        c.lineWidth = 5
        c.beginPath()
        c.arc(300, 160, 50, 0, Math.PI * 2)
        c.stroke()
        c.beginPath()
        c.arc(300, 300, 95, Math.PI * 1.15, Math.PI * 1.85)
        c.stroke()
      }
      // status text
      c.textAlign = 'center'
      let title = 'Look here to enter'
      let sub = 'Stand on the marker and face the camera'
      let note = ''
      if (state === 'scanning') {
        title = awaitingBlink ? 'Please blink once' : 'Scanning…'
        sub = 'Hold still'
      } else if (state === 'open' && decision) {
        title = `✓ ${decision.title}`
        sub = 'Eligible to enter: please walk through'
        note = decision.notice ?? ''
      } else if (state === 'denied' && decision) {
        title = `✕ ${decision.title}`
        sub = decision.reason
      }
      c.fillStyle = state === 'locked' ? '#fafafa' : color
      c.font = `700 32px ${FONT}`
      c.fillText(title, 300, 330)
      c.fillStyle = '#d4d4d8'
      c.font = `400 19px ${FONT}`
      wrap(c, sub, 560)
        .slice(0, 2)
        .forEach((l, i) => c.fillText(l, 300, 360 + i * 22))
      if (note) {
        c.fillStyle = '#fbbf24'
        c.font = `600 18px ${FONT}`
        c.fillText(note, 300, 408)
      }
    })
  }, [state, decision, awaitingBlink, cameraLive, color])

  // The real webcam image, shown on the tablet as a "video texture".
  const videoTex = useMemo(() => {
    if (!video || !cameraLive) return null
    const t = new THREE.VideoTexture(video)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping
    t.repeat.x = -1 // mirror, like a selfie camera
    return t
  }, [video, cameraLive])

  useEffect(() => () => videoTex?.dispose(), [videoTex])
  useEffect(() => () => screen.dispose(), [screen])

  // Turn the tablet to face the person standing on the marker.
  const yaw = Math.atan2(SCAN_SPOT.x - TABLET_POS.x, SCAN_SPOT.z - TABLET_POS.z)
  const W = 0.42
  const H = 0.294

  return (
    <group position={[TABLET_POS.x, 1.085, TABLET_POS.z]} rotation-y={yaw}>
      {/* stand */}
      <mesh position-y={0.005}>
        <cylinderGeometry args={[0.08, 0.09, 0.015, 24]} />
        <meshStandardMaterial color="#27272a" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, -0.02]} rotation-x={-0.35}>
        <boxGeometry args={[0.03, 0.15, 0.02]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.6} />
      </mesh>
      {/* tablet body, tilted back slightly */}
      <group position={[0, 0.23, 0]} rotation-x={-0.3}>
        <mesh>
          <boxGeometry args={[W + 0.02, H + 0.02, 0.012]} />
          <meshStandardMaterial color="#18181b" metalness={0.4} roughness={0.3} />
        </mesh>
        {/* front camera dot */}
        <mesh position={[0, H / 2 + 0.004, 0.007]}>
          <circleGeometry args={[0.004, 12]} />
          <meshBasicMaterial color={state === 'scanning' ? '#38bdf8' : '#3f3f46'} />
        </mesh>
        <mesh position-z={0.0065}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        {videoTex && (
          // the camera area on the canvas is 300×225 px of 600×420, centred at y = 174 px
          <mesh position={[0, H * (0.5 - 174.5 / 420), 0.007]}>
            <planeGeometry args={[W * (292 / 600), H * (217 / 420)]} />
            <meshBasicMaterial map={videoTex} toneMapped={false} />
          </mesh>
        )}
      </group>
      <pointLight position={[0, 0.35, 0.25]} color={color} intensity={1.2} distance={1.6} />
    </group>
  )
}
