import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { canStand, SPAWN, TABLET_POS, useKeys, zoneOf } from './helpers'
import { Humanoid, poseWalk, useRig } from './Humanoid'

// The member you control. Carries a gym bag and a laptop bag.
// Movement comes from the keyboard, or from the guided demo ("autopilot"),
// which supplies a list of points to walk to.

export interface Waypoint {
  x: number
  z: number
}

interface Props {
  playerRef: RefObject<THREE.Vector3>
  gateOpenRef: RefObject<boolean>
  autopilotRef: RefObject<Waypoint[]>
  onManualMove: () => void
  resetToken: number
}

const SPEED = 2.2 // metres per second

export function Character({ playerRef, gateOpenRef, autopilotRef, onManualMove, resetToken }: Props) {
  const root = useRef<THREE.Group>(null!)
  const rig = useRig()
  const keys = useKeys()
  const phase = useRef(0)
  const heading = useRef(Math.PI) // facing -Z (towards the club)

  // Put the character back at the start whenever resetToken changes.
  useEffect(() => {
    root.current.position.copy(SPAWN)
    heading.current = Math.PI
    playerRef.current.copy(SPAWN)
  }, [resetToken, playerRef])

  // useFrame runs once per rendered frame (~60×/s). `dt` = seconds since last frame.
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1)
    const k = keys.current
    const p = root.current.position
    const dir = new THREE.Vector2(
      (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
      (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0),
    )
    const path = autopilotRef.current
    if (dir.lengthSq() > 0) {
      if (path.length) onManualMove() // keyboard takes over from the guided demo
    } else if (path.length) {
      // Autopilot: head towards the next waypoint; drop it when we arrive.
      const target = path[0]
      dir.set(target.x - p.x, target.z - p.z)
      if (dir.length() < 0.08) {
        path.shift()
        dir.set(0, 0)
      }
    }

    const moving = dir.lengthSq() > 0
    if (moving) {
      const step = Math.min(SPEED * dt, dir.length())
      dir.normalize().multiplyScalar(step) // velocity × time = distance
      const open = gateOpenRef.current
      const stuck = !canStand(p.x, p.z, open) // if the turnstile locked on us, let us walk out
      // Try the full move, then each axis alone, so we can "slide" along walls.
      if (stuck || canStand(p.x + dir.x, p.z + dir.y, open)) {
        p.x += dir.x
        p.z += dir.y
      } else if (canStand(p.x + dir.x, p.z, open)) p.x += dir.x
      else if (canStand(p.x, p.z + dir.y, open)) p.z += dir.y

      // Turn smoothly towards the walking direction. atan2 converts a direction into an angle.
      const targetAngle = Math.atan2(dir.x, dir.y)
      let delta = targetAngle - heading.current
      delta = Math.atan2(Math.sin(delta), Math.cos(delta)) // shortest way round
      heading.current += delta * Math.min(1, dt * 10)
      phase.current += dt * 8.5
    } else {
      phase.current *= 0.85 // ease limbs back to standing
      // Standing at the marker: turn to face the tablet, like a real person would.
      if (zoneOf(p.x, p.z) === 'scanner') {
        const face = Math.atan2(TABLET_POS.x - p.x, TABLET_POS.z - p.z)
        let delta = face - heading.current
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        heading.current += delta * Math.min(1, dt * 5)
      }
    }

    rig.body.current.rotation.y = heading.current
    poseWalk(rig, phase.current, moving ? 1 : 0)
    playerRef.current.copy(p)
  })

  return (
    <group ref={root}>
      <Humanoid
        rig={rig}
        look={{ skin: '#7c4a2d', shirt: BRAND_SHIRT, shorts: '#111827', hair: '#0b0b0b', gymBag: true, laptopBag: true }}
      />
    </group>
  )
}

const BRAND_SHIRT = '#e3061b'
