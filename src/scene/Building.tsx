import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BRAND_RED, FONT, makeCanvasTexture } from './helpers'

// The static parts of the world: street, club building, lobby and gym floor.
// A "mesh" = geometry (the shape) + material (how its surface reacts to light).
// The facade is inspired by a modern club: grey clad upper level, a white panel
// with a red sweeping band, white pillars and a revolving glass door.

/** Height of the red band's centre line at position x (a smooth S-curve). */
function bandY(x: number) {
  const t = THREE.MathUtils.smoothstep(x, -1.5, 5.5) // 0 on the left, 1 on the right
  return 5.4 + t * 2.0
}

export function Building() {
  // --- textures painted on a <canvas> -------------------------------------------------
  const cladding = useMemo(() => {
    const t = makeCanvasTexture(256, 256, (c) => {
      c.fillStyle = '#6b7280'
      c.fillRect(0, 0, 256, 256)
      for (let x = 0; x < 256; x += 16) {
        c.fillStyle = '#4b5563'
        c.fillRect(x, 0, 3, 256) // vertical ribs
        c.fillStyle = '#9ca3af'
        c.fillRect(x + 3, 0, 1, 256)
      }
    })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(9, 2)
    return t
  }, [])

  const signTex = useMemo(
    () =>
      makeCanvasTexture(1024, 320, (c) => {
        c.clearRect(0, 0, 1024, 320)
        c.textAlign = 'center'
        c.fillStyle = BRAND_RED
        c.font = `700 150px ${FONT}`
        c.fillText('Greenacres', 512, 170)
        c.fillStyle = '#374151'
        c.font = `600 54px ${FONT}`
        c.fillText('H E A L T H   C L U B', 512, 260)
      }),
    [],
  )

  const parkingTex = useMemo(() => {
    const t = makeCanvasTexture(256, 256, (c) => {
      c.fillStyle = '#4b5563'
      c.fillRect(0, 0, 256, 256)
      c.fillStyle = '#e5e7eb'
      c.fillRect(0, 0, 6, 150) // bay line
    })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(12, 1)
    return t
  }, [])

  const wallText = useMemo(
    () =>
      makeCanvasTexture(1024, 256, (c) => {
        c.fillStyle = '#18181b'
        c.fillRect(0, 0, 1024, 256)
        c.textAlign = 'center'
        c.font = `800 120px ${FONT}`
        c.fillStyle = '#fafafa'
        c.fillText('MOVE  BETTER', 512, 165)
        c.fillStyle = BRAND_RED
        c.fillRect(312, 200, 400, 12)
      }),
    [],
  )

  const entranceSign = useMemo(
    () =>
      makeCanvasTexture(1024, 192, (c) => {
        c.fillStyle = BRAND_RED
        c.fillRect(0, 0, 1024, 192)
        c.fillStyle = '#ffffff'
        c.font = `700 84px ${FONT}`
        c.textAlign = 'left'
        c.fillText('MEMBERS ENTRANCE', 60, 125)
        c.font = `700 110px ${FONT}`
        c.fillText('↓', 930, 135)
      }),
    [],
  )

  // --- shapes for the red band and the white panel -------------------------------------
  const { bandGeo, panelGeo } = useMemo(() => {
    const xs: number[] = []
    for (let x = -6.6; x <= 9.001; x += 0.25) xs.push(x)
    const band = new THREE.Shape()
    band.moveTo(xs[0], bandY(xs[0]) + 0.45)
    xs.forEach((x) => band.lineTo(x, bandY(x) + 0.45))
    ;[...xs].reverse().forEach((x) => band.lineTo(x, bandY(x) - 0.45))
    const panel = new THREE.Shape()
    panel.moveTo(-6.6, 3.4)
    panel.lineTo(4.4, 3.4)
    xs.filter((x) => x <= 4.4)
      .reverse()
      .forEach((x) => panel.lineTo(x, bandY(x) - 0.45))
    return {
      // "Extrude" pushes a flat 2D shape out into 3D, like a cookie cutter.
      bandGeo: new THREE.ExtrudeGeometry(band, { depth: 0.5, bevelEnabled: false }),
      panelGeo: new THREE.ExtrudeGeometry(panel, { depth: 0.3, bevelEnabled: false }),
    }
  }, [])

  const glass = (
    <meshStandardMaterial color="#a5c8e1" transparent opacity={0.22} metalness={0.4} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
  )
  const white = <meshStandardMaterial color="#f4f4f5" roughness={0.6} />
  const frame = <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />

  return (
    <group>
      {/* ---------------- OUTSIDE ---------------- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 20]} receiveShadow>
        <planeGeometry args={[120, 60]} />
        <meshStandardMaterial color="#6b7280" roughness={0.95} />
      </mesh>
      {/* pavement in front of the club */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 1.9]} receiveShadow>
        <planeGeometry args={[19, 3.8]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.9} />
      </mesh>
      {/* parking bays */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 9.5]} receiveShadow>
        <planeGeometry args={[30, 6]} />
        <meshStandardMaterial map={parkingTex} roughness={0.95} />
      </mesh>
      {/* a few parked cars (simple shapes) */}
      {[
        [-7.5, '#f8fafc'],
        [-5, '#b91c1c'],
        [5, '#e5e7eb'],
        [7.5, '#1f2937'],
      ].map(([x, c]) => (
        <Car key={x as number} x={x as number} color={c as string} />
      ))}
      {/* landscaping strip */}
      {[-8, -5.5, 5.5, 8].map((x) => (
        <group key={x} position={[x, 0, 4.2]}>
          <mesh position-y={0.15}>
            <boxGeometry args={[2, 0.3, 0.8]} />
            <meshStandardMaterial color="#3f6212" />
          </mesh>
          <mesh position-y={0.6} castShadow>
            <icosahedronGeometry args={[0.45, 1]} />
            <meshStandardMaterial color="#4d7c0f" flatShading />
          </mesh>
        </group>
      ))}

      {/* ---------------- FACADE ---------------- */}
      {/* glass shop-front either side of the revolving door */}
      <mesh position={[(9 + 1.25) / 2, 1.7, 0]}>
        <boxGeometry args={[9 - 1.25, 3.4, 0.05]} />
        {glass}
      </mesh>
      <mesh position={[-(9 + 1.25) / 2, 1.7, 0]}>
        <boxGeometry args={[9 - 1.25, 3.4, 0.05]} />
        {glass}
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[2.5, 0.7, 0.1]} />
        {frame}
      </mesh>
      {/* window frames */}
      {[-7.5, -5.5, -3.5, -1.3, 1.3, 3.5, 5.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 1.7, 0]}>
          <boxGeometry args={[0.07, 3.4, 0.1]} />
          {frame}
        </mesh>
      ))}
      {/* upper level: grey ribbed cladding, cantilevered over the pavement */}
      <mesh position={[0, 6.1, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[18.2, 5.4, 2.4]} />
        <meshStandardMaterial map={cladding} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* soffit (underside) with downlights */}
      <mesh position={[0, 3.38, 0.9]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[18.2, 1.7]} />
        <meshStandardMaterial color="#e4e4e7" side={THREE.DoubleSide} />
      </mesh>
      {[-6, -3, 0, 3, 6].map((x) => (
        <mesh key={x} position={[x, 3.36, 1.2]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.12, 16]} />
          <meshStandardMaterial color="#fffbeb" emissive="#fffbeb" emissiveIntensity={2} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* white panel + red sweeping band on the front of the upper level */}
      <mesh geometry={panelGeo} position-z={1.75} castShadow>
        {white}
      </mesh>
      <mesh geometry={bandGeo} position-z={1.75} castShadow>
        <meshStandardMaterial color={BRAND_RED} roughness={0.45} />
      </mesh>
      {/* club sign on the white panel */}
      <mesh position={[-2.3, 4.25, 2.07]}>
        <planeGeometry args={[3.8, 1.19]} />
        <meshBasicMaterial map={signTex} transparent toneMapped={false} />
      </mesh>
      {/* horizontal louvres on the right of the upper level */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[6.4, 4.0 + i * 0.16, 1.8]}>
          <boxGeometry args={[5.2, 0.05, 0.12]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.5} />
        </mesh>
      ))}
      {/* white pillars holding up the upper level */}
      {[-6, -3, 3, 6].map((x) => (
        <mesh key={x} position={[x, 1.7, 1.8]} castShadow>
          <boxGeometry args={[0.4, 3.4, 0.4]} />
          {white}
        </mesh>
      ))}

      <RevolvingDoor />

      {/* ---------------- LOBBY ---------------- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, -3.9]} receiveShadow>
        <planeGeometry args={[18, 7.8]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.35} metalness={0.05} />
      </mesh>
      {/* red entrance mat leading from the door */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, -2.2]}>
        <planeGeometry args={[1.6, 2.6]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} />
      </mesh>
      {/* hanging sign above the turnstiles */}
      <group position={[-3.6, 3.05, -7.1]}>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 0.6, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.0, 6]} />
            {frame}
          </mesh>
        ))}
        <mesh>
          <boxGeometry args={[3.5, 0.66, 0.06]} />
          <meshStandardMaterial color={BRAND_RED} />
        </mesh>
        <mesh position-z={0.035}>
          <planeGeometry args={[3.4, 0.6]} />
          <meshBasicMaterial map={entranceSign} toneMapped={false} />
        </mesh>
      </group>
      <Lounge />

      {/* ---------------- GYM FLOOR ---------------- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, -13.7]} receiveShadow>
        <planeGeometry args={[18, 11.9]} />
        <meshStandardMaterial color="#27272a" roughness={0.85} />
      </mesh>
      {/* red line marking the free-weights zone */}
      <mesh rotation-x={-Math.PI / 2} position={[-6.2, 0.008, -13.7]}>
        <planeGeometry args={[0.08, 9]} />
        <meshBasicMaterial color={BRAND_RED} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 2, -19.7]} receiveShadow>
        <boxGeometry args={[18, 4, 0.2]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      <mesh position={[0, 2.9, -19.58]}>
        <planeGeometry args={[5, 1.25]} />
        <meshBasicMaterial map={wallText} toneMapped={false} />
      </mesh>
      {/* mirror strip behind the treadmills */}
      <mesh position={[0, 1.2, -19.58]}>
        <planeGeometry args={[12, 1.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.08} />
      </mesh>
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 2, -9.85]} receiveShadow>
          <boxGeometry args={[0.2, 4, 19.7]} />
          <meshStandardMaterial color="#d4d4d8" />
        </mesh>
      ))}
      <Equipment />
    </group>
  )
}

function Car({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, 9.6]}>
      <mesh position-y={0.45} castShadow>
        <boxGeometry args={[1.8, 0.6, 4]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.95, 0.2]} castShadow>
        <boxGeometry args={[1.6, 0.5, 2.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.15} />
      </mesh>
      {[-0.8, 0.8].map((wx) =>
        [-1.3, 1.3].map((wz) => (
          <mesh key={`${wx}${wz}`} position={[wx, 0.32, wz]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 16]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        )),
      )}
    </group>
  )
}

/** A four-wing revolving glass door that turns slowly. */
function RevolvingDoor() {
  const wings = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    wings.current.rotation.y += dt * 0.5
  })
  const R = 1.2
  const steel = <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} />
  return (
    <group>
      {/* curved glass side walls (open on the street and lobby sides) */}
      {[Math.PI / 2, (3 * Math.PI) / 2].map((mid) => (
        <mesh key={mid} position-y={1.25}>
          <cylinderGeometry args={[R, R, 2.5, 32, 1, true, mid - 0.75, 1.5]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.3} side={THREE.DoubleSide} metalness={0.3} roughness={0.05} depthWrite={false} />
        </mesh>
      ))}
      {/* top drum */}
      <mesh position-y={2.65}>
        <cylinderGeometry args={[R + 0.05, R + 0.05, 0.3, 32]} />
        {steel}
      </mesh>
      {/* floor disc */}
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[R, 32]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* turning wings */}
      <group ref={wings}>
        <mesh position-y={1.25}>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 12]} />
          {steel}
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation-y={(i * Math.PI) / 2}>
            <mesh position={[R / 2, 1.25, 0]}>
              <boxGeometry args={[R - 0.08, 2.4, 0.03]} />
              <meshStandardMaterial color="#bfdbfe" transparent opacity={0.28} depthWrite={false} />
            </mesh>
            <mesh position={[R - 0.05, 1.25, 0]}>
              <boxGeometry args={[0.04, 2.4, 0.05]} />
              {steel}
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function Lounge() {
  return (
    <group position={[-6, 0, -3.1]}>
      {/* sofa */}
      <mesh position-y={0.25} castShadow>
        <boxGeometry args={[2.4, 0.5, 0.9]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65, -0.35]} castShadow>
        <boxGeometry args={[2.4, 0.5, 0.2]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.45, 0.12, 0.45]} />
          <meshStandardMaterial color="#e3061b" roughness={0.8} />
        </mesh>
      ))}
      {/* plant */}
      <mesh position={[1.7, 0.3, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.6, 16]} />
        <meshStandardMaterial color="#18181b" />
      </mesh>
      <mesh position={[1.7, 1.0, 0]} castShadow>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color="#15803d" flatShading />
      </mesh>
    </group>
  )
}

function Equipment() {
  const dark = <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.3} />
  const steel = <meshStandardMaterial color="#a1a1aa" roughness={0.3} metalness={0.9} />
  return (
    <group>
      {/* treadmills facing the mirror */}
      {[-2.8, -1.4, 0.1, 1.6, 3.1].map((x) => (
        <group key={x} position={[x, 0, -17.4]}>
          <mesh position-y={0.12} castShadow>
            <boxGeometry args={[0.8, 0.24, 1.9]} />
            {dark}
          </mesh>
          <mesh position-y={0.25}>
            <boxGeometry args={[0.55, 0.02, 1.6]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
          {[-0.36, 0.36].map((dx) => (
            <mesh key={dx} position={[dx, 0.75, -0.8]}>
              <boxGeometry args={[0.05, 1.1, 0.05]} />
              {steel}
            </mesh>
          ))}
          <mesh position={[0, 1.3, -0.82]} rotation-x={-0.4}>
            <boxGeometry args={[0.7, 0.3, 0.06]} />
            {dark}
          </mesh>
          <mesh position={[0, 1.28, -0.86]} rotation-x={-0.4}>
            <boxGeometry args={[0.7, 0.04, 0.02]} />
            <meshStandardMaterial color="#e3061b" emissive="#e3061b" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {/* dumbbell rack along the left wall */}
      <group position={[-8.2, 0, -14]} rotation-y={Math.PI / 2}>
        <mesh position-y={0.55} castShadow>
          <boxGeometry args={[7.6, 0.08, 0.7]} />
          {steel}
        </mesh>
        {Array.from({ length: 16 }, (_, i) => (
          <group key={i} position={[-3.5 + i * 0.47, 0.68, 0]} rotation-x={Math.PI / 2}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
              {steel}
            </mesh>
            {[-0.17, 0.17].map((y) => (
              <mesh key={y} position-y={y}>
                <cylinderGeometry args={[0.06 + i * 0.004, 0.06 + i * 0.004, 0.08, 6]} />
                {dark}
              </mesh>
            ))}
          </group>
        ))}
        {[-3.7, 0, 3.7].map((x) => (
          <mesh key={x} position={[x, 0.27, 0]}>
            <boxGeometry args={[0.08, 0.55, 0.6]} />
            {steel}
          </mesh>
        ))}
      </group>

      {/* squat rack */}
      <group position={[-3.7, 0, -12]}>
        {[-0.9, 0.9].map((x) =>
          [-0.6, 0.6].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 1.2, z]} castShadow>
              <boxGeometry args={[0.08, 2.4, 0.08]} />
              <meshStandardMaterial color={BRAND_RED} metalness={0.4} />
            </mesh>
          )),
        )}
        <mesh position={[0, 1.45, -0.6]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
          {steel}
        </mesh>
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} position={[x, 1.45, -0.6]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
            {dark}
          </mesh>
        ))}
        <mesh position-y={0.02}>
          <boxGeometry args={[2.2, 0.04, 1.6]} />
          <meshStandardMaterial color="#44403c" />
        </mesh>
      </group>

      {/* bench */}
      <group position={[5, 0, -12]}>
        <mesh position-y={0.45} castShadow>
          <boxGeometry args={[2.4, 0.1, 0.45]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.4, 0.4]} />
            {steel}
          </mesh>
        ))}
      </group>

      {/* ceiling light panels */}
      {[-5, 0, 5].map((x) =>
        [-10, -14, -18].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 3.9, z]}>
            <boxGeometry args={[2.4, 0.05, 0.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  )
}
