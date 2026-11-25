// Shared TypeScript types for FacePass.
// A "type" describes the shape of data. TypeScript checks every file against
// these shapes, so a typo like status: 'activ' is caught before the app runs.

/**
 * Account status, as the gym's billing system would report it.
 *  active   = paid up, eligible to enter
 *  reminder = payment due soon: allowed in, but shown a friendly notice
 *  overdue  = missed payment: access paused until resolved
 *  expired  = membership ended
 */
export type MembershipStatus = 'active' | 'reminder' | 'overdue' | 'expired'

export interface Member {
  id: string
  fullName: string
  memberNo: string
  plan: string
  status: MembershipStatus
  expiresOn: string // ISO date, e.g. "2027-03-31"
  paymentDueOn: string // next debit order date
  initials: string
  avatarColor: string
}

/** Who is standing at the tablet (drives the SIMULATED recognition result). */
export type ScenarioId = 'thandi' | 'johan' | 'unknown-visitor' | 'low-confidence'

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  /**
   * The SIMULATED output of a face-recognition model.
   * memberId = which enrolled template scored highest (null = nobody enrolled is close).
   * score    = similarity between 0 and 1.
   */
  simulatedMatch: { memberId: string | null; score: number }
}

export type StepId = 'detection' | 'liveness' | 'recognition' | 'membership'
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface PipelineStep {
  id: StepId
  label: string
  status: StepStatus
  detail: string
}

/** locked = closed & waiting, scanning = checks in progress, open = turnstile free, denied = locked after a failed check */
export type GateState = 'locked' | 'scanning' | 'open' | 'denied'

export type AccessMethod = 'face' | 'phone' | 'reception'

export interface Decision {
  result: 'granted' | 'denied'
  method: AccessMethod
  title: string
  reason: string
  /** Optional message for the member, e.g. a payment reminder. */
  notice?: string
  member: Member | null
}

export interface LogEntry {
  id: number
  time: Date
  kind: 'granted' | 'denied' | 'entry' | 'info'
  title: string
  detail: string
}

/** Live summary of what the webcam + MediaPipe currently see. */
export interface FaceSnapshot {
  faceDetected: boolean
  landmarkCount: number
  blinkCount: number
  fps: number
}
