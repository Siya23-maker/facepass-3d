import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { INITIAL_MEMBERS, SCENARIOS, STATUS_LABEL } from '../data/members'
import {
  authoriseMembership,
  classifyRecognition,
  MATCH_THRESHOLD,
  sleep,
} from '../logic/verification'
import type {
  Decision,
  FaceSnapshot,
  GateState,
  LogEntry,
  Member,
  MembershipStatus,
  PipelineStep,
  ScenarioId,
  StepId,
} from '../types'

// The "brain" of the entrance: runs the verification pipeline,
// decides granted/denied, drives the turnstile, and writes the activity log.

const freshSteps = (): PipelineStep[] => [
  { id: 'detection', label: 'Face detection', status: 'pending', detail: 'Waiting for scan' },
  { id: 'liveness', label: 'Liveness cue (demo)', status: 'pending', detail: 'Not secure anti-spoofing' },
  { id: 'recognition', label: 'Identity recognition', status: 'pending', detail: 'SIMULATED in this prototype' },
  { id: 'membership', label: 'Membership eligibility', status: 'pending', detail: 'Synthetic member database' },
]

const LIVENESS_TIMEOUT_MS = 5000
const GATE_OPEN_TIMEOUT_MS = 15000

export function useAccessController(liveRef: RefObject<FaceSnapshot>) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [scenarioId, setScenarioId] = useState<ScenarioId>('thandi')
  const [steps, setSteps] = useState<PipelineStep[]>(freshSteps)
  const [gate, setGate] = useState<GateState>('locked')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [awaitingBlink, setAwaitingBlink] = useState(false)

  const runId = useRef(0) // increases on every scan/reset so stale async work can stop itself
  const logId = useRef(0)
  const gateTimer = useRef<number | undefined>(undefined)
  // The async scan must read the newest member list, not the one from when it started.
  const membersRef = useRef(members)
  membersRef.current = members

  const addLog = useCallback((kind: LogEntry['kind'], title: string, detail: string) => {
    setLog((prev) => [{ id: ++logId.current, time: new Date(), kind, title, detail }, ...prev].slice(0, 50))
  }, [])

  /** Admin control: change a member's account status (e.g. simulate a missed payment). */
  const setMemberStatus = useCallback(
    (id: string, status: MembershipStatus) => {
      const m = membersRef.current.find((x) => x.id === id)
      if (!m || m.status === status) return
      setMembers((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)))
      addLog('info', `Account updated · ${m.fullName}`, `Status changed to "${STATUS_LABEL[status]}" (billing system)`)
    },
    [addLog],
  )

  const setStep = (id: StepId, status: PipelineStep['status'], detail: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)))

  const openGate = useCallback(() => {
    setGate('open')
    window.clearTimeout(gateTimer.current)
    gateTimer.current = window.setTimeout(() => {
      setGate('locked')
      addLog('info', 'Turnstile re-locked', 'Nobody passed through within 15 s')
    }, GATE_OPEN_TIMEOUT_MS)
  }, [addLog])

  const finish = useCallback(
    (d: Decision) => {
      setDecision(d)
      const how = d.method === 'face' ? 'Face scan' : d.method === 'phone' ? 'Phone app' : 'Reception'
      if (d.result === 'granted') {
        openGate()
        addLog('granted', `ACCESS GRANTED · ${d.member?.fullName ?? 'Visitor'}`, `${how}: ${d.notice ?? d.reason}`)
      } else {
        setGate('denied')
        addLog('denied', `ACCESS DENIED · ${d.member?.fullName ?? 'Unknown'}`, `${how}: ${d.reason}`)
      }
    },
    [addLog, openGate],
  )

  /** Run the four-step pipeline. `simulatedCamera` = no webcam, demo fallback. */
  const scan = useCallback(
    async (simulatedCamera: boolean) => {
      const id = ++runId.current
      const alive = () => runId.current === id
      const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
      window.clearTimeout(gateTimer.current)
      setDecision(null)
      setSteps(freshSteps())
      setGate('scanning')
      const skip = (ids: StepId[]) => ids.forEach((s) => setStep(s, 'skipped', 'Skipped'))

      // 1 · DETECTION (real MediaPipe result, unless camera is simulated)
      setStep('detection', 'running', 'Looking for a face…')
      await sleep(600)
      if (!alive()) return
      const face = liveRef.current
      if (!face.faceDetected) {
        setStep('detection', 'failed', 'No face in view. Look straight at the tablet.')
        skip(['liveness', 'recognition', 'membership'])
        finish({ result: 'denied', method: 'face', title: 'No face detected', reason: 'No face was found in the camera image.', member: null })
        return
      }
      setStep('detection', 'passed', simulatedCamera ? 'SIMULATED (no camera)' : `1 face · ${face.landmarkCount} landmarks`)

      // 2 · LIVENESS CUE: wait for a blink. This is NOT secure: a video can blink.
      setStep('liveness', 'running', 'Please blink once…')
      if (simulatedCamera) {
        await sleep(900)
        if (!alive()) return
        setStep('liveness', 'passed', 'SIMULATED (no camera)')
      } else {
        setAwaitingBlink(true)
        const startBlinks = liveRef.current.blinkCount
        const deadline = performance.now() + LIVENESS_TIMEOUT_MS
        while (liveRef.current.blinkCount === startBlinks && performance.now() < deadline) {
          await sleep(80)
          if (!alive()) return setAwaitingBlink(false)
        }
        setAwaitingBlink(false)
        if (liveRef.current.blinkCount === startBlinks) {
          setStep('liveness', 'failed', 'No blink seen within 5 s')
          skip(['recognition', 'membership'])
          finish({ result: 'denied', method: 'face', title: 'Please try again', reason: 'No blink was detected.', member: null })
          return
        }
        setStep('liveness', 'passed', 'Blink detected (demo cue only)')
      }

      // 3 · RECOGNITION (SIMULATED: outcome comes from the chosen scenario)
      setStep('recognition', 'running', 'Comparing with enrolled templates…')
      await sleep(1100)
      if (!alive()) return
      const rec = classifyRecognition(scenario, membersRef.current)
      const pct = (n: number) => `${Math.round(n * 100)}%`
      if (rec.kind === 'no-match') {
        setStep('recognition', 'failed', `SIMULATED · no enrolled match (best ${pct(rec.score)})`)
        skip(['membership'])
        finish({ result: 'denied', method: 'face', title: 'Not a registered member', reason: 'Visitors please sign in at reception.', member: null })
        return
      }
      if (rec.kind === 'uncertain') {
        setStep('recognition', 'failed', `SIMULATED · ${pct(rec.score)} similarity, below ${pct(MATCH_THRESHOLD)} threshold`)
        skip(['membership'])
        finish({ result: 'denied', method: 'face', title: 'Identity not confirmed', reason: `Match too uncertain (${pct(rec.score)}). Please use the app or reception.`, member: rec.member })
        return
      }
      setStep('recognition', 'passed', `SIMULATED · ${rec.member.fullName} (${pct(rec.score)})`)

      // 4 · MEMBERSHIP ELIGIBILITY (mock database)
      setStep('membership', 'running', 'Checking account…')
      await sleep(700)
      if (!alive()) return
      const auth = authoriseMembership(rec.member)
      setStep('membership', auth.ok ? 'passed' : 'failed', auth.notice ? `Eligible · ${auth.notice}` : auth.reason)
      const first = rec.member.fullName.split(' ')[0]
      finish(
        auth.ok
          ? { result: 'granted', method: 'face', title: `Welcome, ${first}`, reason: auth.reason, notice: auth.notice, member: rec.member }
          : {
              result: 'denied',
              method: 'face',
              title: rec.member.status === 'overdue' ? 'Missed payment' : 'Membership not active',
              reason: auth.reason,
              member: rec.member,
            },
      )
    },
    [scenarioId, liveRef, finish],
  )

  /** Fallbacks: the existing phone app, or a staff member at reception (both simulated). */
  const manualAccess = useCallback(
    (method: 'phone' | 'reception') => {
      runId.current++
      const id = decision?.member?.id
      const member = membersRef.current.find((m) => m.id === id) ?? null
      if (method === 'reception') {
        finish({ result: 'granted', method, title: 'Staff override', reason: 'Reception checked the person manually.', member })
        return
      }
      if (!member) {
        finish({ result: 'denied', method, title: 'No member account', reason: 'No membership on the phone app. Please sign in at reception.', member: null })
        return
      }
      const auth = authoriseMembership(member)
      finish(
        auth.ok
          ? { result: 'granted', method, title: `Welcome, ${member.fullName.split(' ')[0]}`, reason: 'Phone QR code accepted.', notice: auth.notice, member }
          : { result: 'denied', method, title: 'Membership not active', reason: auth.reason, member },
      )
    },
    [decision, finish],
  )

  /** Called by the 3D scene when the character walks through the open turnstile. */
  const onPassedGate = useCallback(() => {
    window.clearTimeout(gateTimer.current)
    addLog('entry', `Entered · ${decision?.member?.fullName ?? 'Visitor'}`, 'Passed through turnstile 1 (FacePass lane)')
    window.setTimeout(() => setGate('locked'), 900)
  }, [addLog, decision])

  const reset = useCallback(() => {
    runId.current++
    window.clearTimeout(gateTimer.current)
    setAwaitingBlink(false)
    setSteps(freshSteps())
    setDecision(null)
    setGate('locked')
  }, [])

  useEffect(() => () => window.clearTimeout(gateTimer.current), [])

  return {
    members,
    setMemberStatus,
    scenarioId,
    setScenarioId,
    steps,
    gate,
    decision,
    log,
    awaitingBlink,
    scan,
    manualAccess,
    onPassedGate,
    reset,
  }
}
