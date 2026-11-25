import type { Member, Scenario } from '../types'

// ---------------------------------------------------------------------------
// The four separate questions an access-control system must answer:
//
//   1. DETECTION      Is there a face in front of the camera?        (real: MediaPipe)
//   2. LIVENESS       Is it a live person, not a photo/screen?       (demo cue only: blink)
//   3. RECOGNITION    WHO is it? Compare with enrolled templates.    (SIMULATED in this phase)
//   4. AUTHORISATION  May this person enter right now?               (mock membership DB)
//
// Facial landmarks (step 1) only describe face SHAPE and POSITION.
// They do not tell us who someone is. That needs a recognition model (step 3).
// ---------------------------------------------------------------------------

/** Score at or above this = confident match. */
export const MATCH_THRESHOLD = 0.8
/** Scores between this and MATCH_THRESHOLD are "uncertain": we refuse rather than guess. */
export const UNCERTAIN_FLOOR = 0.55

export type RecognitionOutcome =
  | { kind: 'match'; member: Member; score: number }
  | { kind: 'uncertain'; member: Member | null; score: number }
  | { kind: 'no-match'; score: number }

/** Turn a (simulated) similarity score into a recognition decision. */
export function classifyRecognition(scenario: Scenario, members: Member[]): RecognitionOutcome {
  const { memberId, score } = scenario.simulatedMatch
  const member = members.find((m) => m.id === memberId) ?? null
  if (member && score >= MATCH_THRESHOLD) return { kind: 'match', member, score }
  if (score >= UNCERTAIN_FLOOR) return { kind: 'uncertain', member, score }
  return { kind: 'no-match', score }
}

export interface AuthorisationResult {
  ok: boolean
  reason: string
  notice?: string
}

/** Membership authorisation: identity is known, but is this person eligible today? */
export function authoriseMembership(member: Member, today = new Date()): AuthorisationResult {
  const expiry = new Date(member.expiresOn + 'T23:59:59')
  switch (member.status) {
    case 'overdue':
      return {
        ok: false,
        reason: 'Missed payment: access is paused. Please see reception or update your payment in the app.',
      }
    case 'expired':
      return { ok: false, reason: `Membership ended on ${formatDate(member.expiresOn)}. Please renew at reception.` }
    case 'reminder':
      return {
        ok: true,
        reason: 'Eligible to enter.',
        notice: `Friendly reminder: your payment is due on ${formatDate(member.paymentDueOn)}.`,
      }
    case 'active':
      if (expiry < today) return { ok: false, reason: `Membership ended on ${formatDate(member.expiresOn)}.` }
      return { ok: true, reason: 'Eligible to enter.' }
  }
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
