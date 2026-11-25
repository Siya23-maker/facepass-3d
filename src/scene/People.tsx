import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Humanoid, poseWalk, useRig, type Look } from './Humanoid'

// Other people in the club, so the scene feels alive.
// They follow fixed loops and do not interact with the player.

const LOOKS: Look[] = [
  { skin: '#c68863', shirt: '#111827', shorts: '#374151', hair: '#3b2414' },
  { skin: '#5b3a24', shirt: '#f8fafc', shorts: '#e3061b', hair: '#0b0b0b' },
  { skin: '#e8b996', shirt: '#0ea5e9', shorts: '#1f2937', hair: '#a16207' },
  { skin: '#8d5a3b', shirt: '#22c55e', shorts: '#111827', hair: '#111111' },
  { skin: '#3f2a1d', shirt: '#9333ea', shorts: '#111827', hair: '#0b0b0b' },
]

/** Walks round a loop of points forever. */
function Walker({ path, look, speed = 1.3, offset = 0 }: { path: [number, number][]; look: Look; speed?: number; offset?: number }) {
  const root = useRef<THREE.Group>(null!)
  const rig = useRig()
  const state = useRef({ i: 0, phase: offset, init: false, heading: 0 })

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1)
    const s = state.current
    const p = root.current.position
    if (!s.init) {
      p.set(path[0][0], 0, path[0][1])
      s.i = 1
      s.init = true
    }
    const [tx, tz] = path[s.i]
    const dx = tx - p.x
    const dz = tz - p.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) s.i = (s.i + 1) % path.length
    else {
      const step = Math.min(dist, speed * dt)
      p.x += (dx / dist) * step
      p.z += (dz / dist) * step
      const target = Math.atan2(dx, dz)
      let d = target - s.heading
      d = Math.atan2(Math.sin(d), Math.cos(d))
      s.heading += d * Math.min(1, dt * 6)
    }
    s.phase += dt * 8 * (speed / 1.3)
    rig.body.current.rotation.y = s.heading
    poseWalk(rig, s.phase, 1)
  })

  return (
    <group ref={root}>
      <Humanoid rig={rig} look={look} />
    </group>
  )
}

/** Runs on the spot (on a treadmill). */
function Runner({ position, look, offset = 0 }: { position: [number, number, number]; look: Look; offset?: number }) {
  const rig = useRig()
  useFrame(({ clock }) => {
    rig.body.current.rotation.y = Math.PI // facing the back wall
    poseWalk(rig, clock.elapsedTime * 11 + offset, 1, true)
  })
  return (
    <group position={position}>
      <Humanoid rig={rig} look={look} />
    </group>
  )
}

/** Stands still and does an animation with the arms: curls or a friendly idle. */
function Stander({
  position,
  facing,
  look,
  action,
}: {
  position: [number, number, number]
  facing: number
  look: Look
  action: 'curl' | 'idle'
}) {
  const rig = useRig()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    rig.body.current.rotation.y = facing
    if (action === 'curl') {
      const a = (Math.sin(t * 2.5) + 1) * 0.9 // bend forward and back
      rig.armL.current.rotation.x = -a
      rig.armR.current.rotation.x = -a
    } else {
      rig.armL.current.rotation.x = Math.sin(t * 0.8) * 0.05
      rig.armR.current.rotation.x = -0.6 + Math.sin(t * 1.3) * 0.08 // hand resting on the desk
      rig.body.current.rotation.y = facing + Math.sin(t * 0.4) * 0.15
    }
  })
  return (
    <group position={position}>
      <Humanoid rig={rig} look={look} />
    </group>
  )
}

export function People() {
  return (
    <group>
      {/* receptionist behind the entrance counter, facing the lobby */}
      <Stander
        position={[2.85, 0, -5.9]}
        facing={-Math.PI / 2}
        action="idle"
        look={{ skin: '#6b4226', shirt: '#e3061b', shorts: '#111827', hair: '#111111', badge: true }}
      />
      {/* gym floor */}
      <Walker
        path={[
          [-5.5, -9.2],
          [5.5, -9.2],
          [5.5, -14.5],
          [-5.5, -14.5],
        ]}
        look={LOOKS[0]}
        speed={1.1}
      />
      <Walker
        path={[
          [6.8, -14],
          [-1.5, -14],
          [-1.5, -10],
          [6.8, -10],
        ]}
        look={LOOKS[2]}
        speed={1.4}
        offset={2}
      />
      <Runner position={[-2.8, 0.26, -17.3]} look={LOOKS[1]} />
      <Runner position={[1.6, 0.26, -17.3]} look={LOOKS[3]} offset={1.3} />
      <Stander position={[-6.8, 0, -13]} facing={-Math.PI / 2} action="curl" look={LOOKS[4]} />
      {/* someone strolling past outside, also carrying a gym bag */}
      <Walker
        path={[
          [-8, 5],
          [8, 5],
        ]}
        look={{ ...LOOKS[2], shirt: '#64748b', gymBag: true }}
        speed={1.2}
      />
    </group>
  )
}
