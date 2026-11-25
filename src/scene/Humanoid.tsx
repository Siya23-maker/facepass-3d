import { useRef, type RefObject } from 'react'
import * as THREE from 'three'

// A reusable human figure built from primitive shapes.
// Limbs sit inside "pivot" groups at the hip/shoulder, so rotating the group
// swings the limb from the joint, like a real leg.
// Both the player and the other gym-goers use this component.

export interface Rig {
  body: RefObject<THREE.Group>
  legL: RefObject<THREE.Group>
  legR: RefObject<THREE.Group>
  armL: RefObject<THREE.Group>
  armR: RefObject<THREE.Group>
}

export function useRig(): Rig {
  return {
    body: useRef<THREE.Group>(null!),
    legL: useRef<THREE.Group>(null!),
    legR: useRef<THREE.Group>(null!),
    armL: useRef<THREE.Group>(null!),
    armR: useRef<THREE.Group>(null!),
  }
}

/** Swing the limbs for walking/running. `amount` 0 = standing still, 1 = full stride. */
export function poseWalk(rig: Rig, phase: number, amount: number, run = false) {
  const swing = Math.sin(phase) * (run ? 0.9 : 0.6) * amount
  rig.legL.current.rotation.x = swing
  rig.legR.current.rotation.x = -swing
  // An arm carrying a bag swings less than a free arm.
  rig.armL.current.rotation.x = -swing * 0.8
  rig.armR.current.rotation.x = swing * 0.25
  if (run) {
    rig.armL.current.rotation.x = -swing * 1.1
    rig.armR.current.rotation.x = swing * 1.1
  }
  rig.body.current.position.y = Math.abs(Math.cos(phase)) * (run ? 0.07 : 0.04) * amount
}

export interface Look {
  skin: string
  shirt: string
  shorts: string
  hair: string
  shoes?: string
  /** gym duffel bag in the right hand */
  gymBag?: boolean
  /** laptop bag hanging from the left shoulder */
  laptopBag?: boolean
  /** a staff lanyard / name badge */
  badge?: boolean
}

export function Humanoid({ rig, look }: { rig: Rig; look: Look }) {
  const skin = <meshStandardMaterial color={look.skin} roughness={0.6} />
  return (
    <group>
      {/* soft round shadow under the feet */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <circleGeometry args={[0.35, 24]} />
        <meshBasicMaterial color="black" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={rig.body}>
        {/* legs */}
        {([
          [rig.legL, -0.11],
          [rig.legR, 0.11],
        ] as const).map(([ref, x], i) => (
          <group key={i} ref={ref} position={[x, 0.92, 0]}>
            <mesh position-y={-0.22} castShadow>
              <capsuleGeometry args={[0.1, 0.32, 6, 12]} />
              <meshStandardMaterial color={look.shorts} />
            </mesh>
            <mesh position-y={-0.6} castShadow>
              <capsuleGeometry args={[0.075, 0.38, 6, 12]} />
              {skin}
            </mesh>
            <mesh position={[0, -0.86, 0.05]} castShadow>
              <boxGeometry args={[0.13, 0.09, 0.28]} />
              <meshStandardMaterial color={look.shoes ?? '#f8fafc'} />
            </mesh>
          </group>
        ))}
        {/* torso */}
        <mesh position-y={1.27} castShadow>
          <capsuleGeometry args={[0.2, 0.38, 8, 16]} />
          <meshStandardMaterial color={look.shirt} roughness={0.55} />
        </mesh>
        {/* arms: left (-x) and right (+x) */}
        {([
          [rig.armL, -0.28],
          [rig.armR, 0.28],
        ] as const).map(([ref, x], i) => (
          <group key={i} ref={ref} position={[x, 1.5, 0]}>
            <mesh position-y={-0.14} castShadow>
              <capsuleGeometry args={[0.07, 0.16, 6, 12]} />
              <meshStandardMaterial color={look.shirt} />
            </mesh>
            <mesh position-y={-0.4} castShadow>
              <capsuleGeometry args={[0.055, 0.3, 6, 12]} />
              {skin}
            </mesh>
            {/* the duffel bag hangs from the right hand, so it swings with the arm */}
            {i === 1 && look.gymBag && <GymBag />}
          </group>
        ))}
        {/* neck + head */}
        <mesh position-y={1.62}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
          {skin}
        </mesh>
        <mesh position-y={1.79} castShadow>
          <sphereGeometry args={[0.14, 24, 24]} />
          {skin}
        </mesh>
        <mesh position={[0, 1.84, -0.015]} scale={[1.05, 0.8, 1.05]}>
          <sphereGeometry args={[0.14, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={look.hair} roughness={0.9} />
        </mesh>
        {/* eyes (on +Z, the "front" of the model) */}
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 1.81, 0.128]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        ))}
        {look.laptopBag && <LaptopBag />}
        {look.badge && (
          <mesh position={[0.1, 1.28, 0.2]}>
            <boxGeometry args={[0.08, 0.11, 0.01]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}
      </group>
    </group>
  )
}

/** A red-and-black duffel bag, held by its handles. */
function GymBag() {
  return (
    <group position={[0.05, -0.78, 0]}>
      {/* handles */}
      <mesh position-y={0.1}>
        <torusGeometry args={[0.07, 0.012, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* the bag body: a capsule lying on its side */}
      <mesh position-y={-0.05} rotation-x={Math.PI / 2} castShadow>
        <capsuleGeometry args={[0.13, 0.3, 6, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} />
      </mesh>
      <mesh position={[0.135, -0.05, 0]} rotation-x={Math.PI / 2}>
        <capsuleGeometry args={[0.02, 0.3, 4, 8]} />
        <meshStandardMaterial color="#e3061b" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** A slim laptop bag at the left hip, with a strap across the chest. */
function LaptopBag() {
  return (
    <group>
      {/* strap from right shoulder down to left hip */}
      <mesh position={[0.02, 1.27, 0.035]} rotation-z={-0.75}>
        <boxGeometry args={[0.035, 0.75, 0.42]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-0.3, 0.95, 0.02]} rotation-y={0.15} castShadow>
        <boxGeometry args={[0.07, 0.3, 0.4]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      <mesh position={[-0.338, 0.98, 0.02]} rotation-y={0.15}>
        <boxGeometry args={[0.005, 0.12, 0.3]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  )
}
