import { useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Decision, GateState } from '../types'
import { Building } from './Building'
import { Character, type Waypoint } from './Character'
import { EntranceCounter, Turnstiles } from './Entrance'
import { SPAWN, TABLET_POS, TURNSTILE_Z, zoneOf, type Zone } from './helpers'
import { Labels } from './Labels'
import { People } from './People'

// <Canvas> creates the WebGL renderer, a scene and a camera for us.
// Everything inside it is a 3D object, not HTML.

interface Props {
  gate: GateState
  decision: Decision | null
  awaitingBlink: boolean
  video: HTMLVideoElement | null
  cameraLive: boolean
  showLabels: boolean
  zone: Zone
  resetToken: number
  autopilotRef: RefObject<Waypoint[]>
  onManualMove: () => void
  onZoneChange: (zone: Zone) => void
  onPassedGate: () => void
}

export function GymScene(props: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, near: 0.05, far: 160, position: [0, 4, 15] }}>
      <color attach="background" args={['#9cc3e6']} />
      <fog attach="fog" args={['#c7dcef', 30, 90]} />
      <Lights />
      <Building />
      <Turnstiles state={props.gate} />
      <EntranceCounter
        state={props.gate}
        decision={props.decision}
        awaitingBlink={props.awaitingBlink}
        video={props.video}
        cameraLive={props.cameraLive}
      />
      <People />
      <Labels zone={props.zone} show={props.showLabels} />
      <Player {...props} />
    </Canvas>
  )
}

function Lights() {
  return (
    <>
      {/* sky/ground light: bright from above, warmer bounce from below */}
      <hemisphereLight args={['#e0f2fe', '#a8a29e', 1.1]} />
      {/* the sun: a directional light that casts shadows */}
      <directionalLight
        position={[8, 14, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-22}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
      {/* interior lighting */}
      <pointLight position={[-3, 3.4, -4]} intensity={10} distance={10} color="#fff7ed" />
      <pointLight position={[2, 3.4, -11]} intensity={14} distance={12} color="#ffffff" />
      <pointLight position={[-3, 3.4, -16]} intensity={14} distance={12} color="#ffffff" />
    </>
  )
}

/** The character plus everything that depends on where it is. */
function Player({ gate, resetToken, autopilotRef, onManualMove, onZoneChange, onPassedGate }: Props) {
  const playerRef = useRef(SPAWN.clone())
  const gateOpenRef = useRef(false)
  const zone = useRef<Zone>('outside')
  const passedFired = useRef(false)

  // Keep a ref in sync with the prop so the per-frame code always sees the latest value.
  useEffect(() => {
    gateOpenRef.current = gate === 'open'
    if (gate === 'open') passedFired.current = false
  }, [gate])

  useFrame(() => {
    const p = playerRef.current
    const z = zoneOf(p.x, p.z)
    if (z !== zone.current) {
      zone.current = z
      onZoneChange(z)
    }
    if (gateOpenRef.current && !passedFired.current && p.z < TURNSTILE_Z - 0.7) {
      passedFired.current = true
      onPassedGate()
    }
  })

  return (
    <>
      <Character
        playerRef={playerRef}
        gateOpenRef={gateOpenRef}
        autopilotRef={autopilotRef}
        onManualMove={onManualMove}
        resetToken={resetToken}
      />
      <FollowCamera target={playerRef} zone={zone} />
    </>
  )
}

/**
 * A third-person camera that glides after the character.
 * At the tablet it swings round over the shoulder so the tablet is clearly visible.
 */
function FollowCamera({ target, zone }: { target: RefObject<THREE.Vector3>; zone: RefObject<Zone> }) {
  const lookAt = useRef(new THREE.Vector3(0, 1.5, 0))
  const desired = new THREE.Vector3()
  const focus = new THREE.Vector3()
  useFrame(({ camera }, dt) => {
    const t = 1 - Math.exp(-2.5 * Math.min(dt, 0.1)) // smooth, frame-rate independent damping
    const p = target.current
    if (zone.current === 'scanner') {
      // over the member's left shoulder, looking at the tablet
      desired.set(p.x - 1.25, 2.45, p.z + 2.7)
      focus.set(TABLET_POS.x - 0.35, 1.05, TABLET_POS.z - 0.1)
    } else if (zone.current === 'outside') {
      desired.set(p.x * 0.5, 4.3, p.z + 9.5)
      focus.set(p.x * 0.5, 3.0, p.z - 4)
    } else if (zone.current === 'lobby') {
      desired.set(p.x, 2.7, p.z + 4.6)
      focus.set(p.x, 1.2, p.z - 2)
    } else {
      desired.set(p.x, 3.3, p.z + 5)
      focus.set(p.x, 1.1, p.z - 2)
    }
    camera.position.lerp(desired, t)
    // Never let the camera pass through the upper floor of the building above the door.
    if (camera.position.z < 1.95 && camera.position.z > -0.85) {
      camera.position.y = Math.min(camera.position.y, 3.2)
    }
    lookAt.current.lerp(focus, t)
    camera.lookAt(lookAt.current)
  })
  return null
}
