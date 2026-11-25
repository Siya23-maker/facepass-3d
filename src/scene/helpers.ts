import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GateState } from '../types'

// ---------------------------------------------------------------------------
// COORDINATE SYSTEM (Three.js is "right-handed", units = metres)
//   +X → right        +Y → up        +Z → towards the street (outside)
//
//   z > 0          street / parking outside the club
//   z = 0          glass shop-front with the revolving door at x = 0
//   0 > z > -7     lobby: entrance counter with the FacePass tablet
//   z = -7         row of turnstiles (FacePass lane centred on x = 0.3)
//   z < -7         gym floor (members only)
// ---------------------------------------------------------------------------

export const BRAND_RED = '#e3061b'
export const SPAWN = new THREE.Vector3(0, 0, 8)

export const TURNSTILE_Z = -7
export const FACEPASS_LANE_X = 0.3
/** Where the member should stand to face the tablet. */
export const SCAN_SPOT = new THREE.Vector3(FACEPASS_LANE_X, 0, -5.5)
/** The tablet on the counter (world position of the screen). */
export const TABLET_POS = new THREE.Vector3(1.22, 1.27, -6.0)

export const GATE_COLORS: Record<GateState, string> = {
  locked: '#e5e7eb',
  scanning: '#38bdf8',
  open: '#22c55e',
  denied: BRAND_RED,
}

/** Draw on an HTML canvas and use it as a texture (lets us show text without font downloads). */
export function makeCanvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  paint(canvas.getContext('2d')!)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export const FONT = '"Segoe UI", Inter, system-ui, Arial, sans-serif'

/** Tracks which keys are held down. A Set lets us read it every frame without re-rendering. */
export function useKeys() {
  const keys = useRef(new Set<string>())
  useEffect(() => {
    const ignore = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA'
    }
    const down = (e: KeyboardEvent) => {
      if (ignore(e)) return
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
      keys.current.add(k)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear) // avoid "stuck" keys when the window loses focus
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
  return keys
}

/** Axis-aligned boxes (on the floor plane) the character cannot walk into. */
export interface Box2D {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const OBSTACLES: Box2D[] = [
  { minX: 1.0, maxX: 9, minZ: -7.8, maxZ: -4.4 }, // entrance counter + staff area behind it
  { minX: -7.4, maxX: -4.6, minZ: -4.2, maxZ: -2.0 }, // lobby lounge
  { minX: -8.8, maxX: -7.6, minZ: -18, maxZ: -10 }, // dumbbell rack
  { minX: -4, maxX: 4.6, minZ: -18.6, maxZ: -16.4 }, // treadmills
  { minX: 3.6, maxX: 6.4, minZ: -12.4, maxZ: -11.6 }, // bench
  { minX: -4.8, maxX: -2.6, minZ: -12.8, maxZ: -11.2 }, // squat rack
  // street pillars
  ...[-6, -3, 3, 6].map((x) => ({ minX: x - 0.25, maxX: x + 0.25, minZ: 1.55, maxZ: 2.05 })),
]

const RADIUS = 0.28 // the character's "body radius" for collisions

/** Is this position allowed? `gateOpen` = the FacePass turnstile is unlocked. */
export function canStand(x: number, z: number, gateOpen: boolean): boolean {
  if (x < -8.6 || x > 8.6 || z < -19.4 || z > 12) return false // outer limits

  // Shop-front glass + revolving door: only the middle of the door is walkable.
  const inDoorDrum = x * x + z * z < 1.3 * 1.3
  if ((Math.abs(z) < 0.35 || inDoorDrum) && Math.abs(x) > 0.75) return false

  // Turnstile row: only the FacePass lane, and only when it is unlocked.
  if (Math.abs(z - TURNSTILE_Z) < 0.55) {
    const inLane = Math.abs(x - FACEPASS_LANE_X) < 0.22
    if (!inLane || !gateOpen) return false
  }

  for (const b of OBSTACLES) {
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) return false
  }
  return true
}

/** Which part of the building is a position in? Used for the step-by-step guide. */
export type Zone = 'outside' | 'lobby' | 'scanner' | 'inside'
export function zoneOf(x: number, z: number): Zone {
  if (z > 0.5) return 'outside'
  if (z < TURNSTILE_Z - 0.6) return 'inside'
  if (Math.abs(x - FACEPASS_LANE_X) < 0.9 && z < -4.4 && z > -6.5) return 'scanner'
  return 'lobby'
}
