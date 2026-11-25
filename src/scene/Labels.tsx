import { Html } from '@react-three/drei'
import { FACEPASS_LANE_X, TABLET_POS, TURNSTILE_Z, type Zone } from './helpers'

// Floating callouts that explain the scene to a first-time viewer.
// <Html> from Drei places a normal HTML element at a 3D position and keeps it there
// as the camera moves (it projects the 3D point onto the screen each frame).
// Each label only appears in the zones where it is useful, to avoid clutter.

const HTML_STYLE = { pointerEvents: 'none' } as const // defined once, not on every render
const Z_RANGE: [number, number] = [20, 0]

const LABELS: { pos: [number, number, number]; n: string; text: string; sub: string; zones: Zone[] }[] = [
  { pos: [0, 2.9, 1.4], n: '1', text: 'Main entrance', sub: 'Members walk in through the door', zones: ['outside'] },
  {
    pos: [TABLET_POS.x, TABLET_POS.y + 0.6, TABLET_POS.z],
    n: '2',
    text: 'FacePass tablet',
    sub: 'Sits on the entrance counter',
    zones: ['outside', 'lobby', 'scanner'],
  },
  {
    pos: [FACEPASS_LANE_X - 1.7, 1.55, TURNSTILE_Z],
    n: '3',
    text: 'Turnstiles',
    sub: 'Unlock only for eligible members',
    zones: ['lobby', 'scanner'],
  },
  { pos: [2.9, 2.35, -5.9], n: '', text: 'Reception', sub: 'Manual help & overrides', zones: ['lobby'] },
  { pos: [0, 2.4, -14], n: '4', text: 'Gym floor', sub: 'Members only', zones: ['lobby', 'inside'] },
]

// The labels stay mounted all the time and are hidden with CSS instead of being removed:
// creating/destroying <Html> elements repeatedly is slower and can cause glitches.
export function Labels({ zone, show }: { zone: Zone; show: boolean }) {
  return (
    <>
      {LABELS.map((l) => (
        <Html key={l.text} position={l.pos} center zIndexRange={Z_RANGE} style={HTML_STYLE}>
          <div className={`callout ${show && l.zones.includes(zone) ? '' : 'is-hidden'}`}>
            {l.n && <span className="callout-n">{l.n}</span>}
            <div>
              <b>{l.text}</b>
              <small>{l.sub}</small>
            </div>
          </div>
        </Html>
      ))}
    </>
  )
}
