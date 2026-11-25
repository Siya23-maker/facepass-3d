import { SCENARIOS, STATUS_LABEL } from '../data/members'
import { formatDate } from '../logic/verification'
import type { Decision, GateState, LogEntry, Member, MembershipStatus, PipelineStep, ScenarioId } from '../types'

// Small presentational components. They only DISPLAY data passed in as "props"
// and call functions when buttons are clicked. All logic lives in the hooks.

const ICON: Record<PipelineStep['status'], string> = {
  pending: '○',
  running: '◌',
  passed: '✓',
  failed: '✕',
  skipped: '–',
}

export function PipelinePanel(p: {
  steps: PipelineStep[]
  scenarioId: ScenarioId
  onScenario: (id: ScenarioId) => void
  onScan: () => void
  canScan: boolean
  scanHint: string
  busy: boolean
}) {
  const scenario = SCENARIOS.find((s) => s.id === p.scenarioId)!
  return (
    <section className="card">
      <header className="card-head">
        <h2>Verification</h2>
      </header>
      <label className="field">
        <span>
          Who is at the tablet? <em className="tag">SIMULATED RECOGNITION</em>
        </span>
        <select value={p.scenarioId} onChange={(e) => p.onScenario(e.target.value as ScenarioId)} disabled={p.busy}>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <small>{scenario.description}</small>
      </label>
      <button className="btn btn-primary btn-wide" onClick={p.onScan} disabled={!p.canScan}>
        {p.busy ? 'Scanning…' : 'Scan face'}
      </button>
      {!p.canScan && !p.busy && p.scanHint && <p className="hint">{p.scanHint}</p>}
      <ol className="steps">
        {p.steps.map((s, i) => (
          <li key={s.id} className={`step step-${s.status}`}>
            <span className="step-icon">{ICON[s.status]}</span>
            <div>
              <b>
                {i + 1}. {s.label}
              </b>
              <small>{s.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const STATUS_BADGE: Record<MembershipStatus, { cls: string; text: string }> = {
  active: { cls: 'ok', text: '✓ ELIGIBLE TO ENTER' },
  reminder: { cls: 'warn', text: '✓ ELIGIBLE · PAYMENT DUE SOON' },
  overdue: { cls: 'bad', text: '⏸ ACCESS PAUSED · MISSED PAYMENT' },
  expired: { cls: 'bad', text: '✕ MEMBERSHIP EXPIRED' },
}

const STATUS_ORDER: MembershipStatus[] = ['active', 'reminder', 'overdue', 'expired']

/** The member's account, plus demo buttons to change their status (e.g. a missed payment). */
export function AccountPanel({
  member,
  onStatus,
}: {
  member: Member | null
  onStatus: (id: string, s: MembershipStatus) => void
}) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>Member account</h2>
        <span className="pill">SYNTHETIC DATA</span>
      </header>
      {member ? (
        <>
          <div className="member">
            <div className="avatar" style={{ background: member.avatarColor }}>{member.initials}</div>
            <div>
              <b>{member.fullName}</b>
              <small>{member.memberNo} · {member.plan}</small>
              <small>Next payment {formatDate(member.paymentDueOn)} · ends {formatDate(member.expiresOn)}</small>
            </div>
          </div>
          <div className={`eligibility eligibility-${STATUS_BADGE[member.status].cls}`}>
            {STATUS_BADGE[member.status].text}
          </div>
          <div className="seg-label">
            Change account status <em className="tag">DEMO CONTROL</em>
          </div>
          <div className="seg">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`seg-btn seg-${s} ${member.status === s ? 'is-on' : ''}`}
                onClick={() => onStatus(member.id, s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <small className="seg-help">Change the status, then scan again to see the turnstile respond.</small>
        </>
      ) : (
        <p className="muted">Unknown visitor: no member account. They'll be directed to reception.</p>
      )}
    </section>
  )
}

const GATE_LABEL: Record<GateState, string> = {
  locked: 'LOCKED · READY',
  scanning: 'VERIFYING…',
  open: 'UNLOCKED',
  denied: 'LOCKED · DENIED',
}

export function GatePanel(p: {
  gate: GateState
  decision: Decision | null
  onManual: (m: 'phone' | 'reception') => void
}) {
  const d = p.decision
  return (
    <section className={`card gate-card gate-${p.gate}`}>
      <header className="card-head">
        <h2>Turnstile 1 · FacePass lane</h2>
        <span className="gate-dot" />
      </header>
      <div className="gate-status">{GATE_LABEL[p.gate]}</div>
      {d && (
        <div className={`decision decision-${d.result}`}>
          <b>{d.result === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</b>
          <span>{d.title}</span>
          <small>{d.reason}</small>
          {d.notice && <small className="notice">🔔 {d.notice}</small>}
        </div>
      )}
      {p.gate === 'denied' && (
        <div className="manual">
          <small>Alternatives (simulated)</small>
          <div className="row">
            <button className="btn" onClick={() => p.onManual('phone')}>📱 Use phone app</button>
            <button className="btn" onClick={() => p.onManual('reception')}>🛎 Call reception</button>
          </div>
        </div>
      )}
    </section>
  )
}

export function ActivityLog({ log }: { log: LogEntry[] }) {
  return (
    <section className="card log-card">
      <header className="card-head">
        <h2>Activity log</h2>
        <span className="pill">{log.length}</span>
      </header>
      {log.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <ul className="log">
          {log.map((e) => (
            <li key={e.id} className={`log-${e.kind}`}>
              <time>{e.time.toLocaleTimeString('en-ZA', { hour12: false })}</time>
              <div>
                <b>{e.title}</b>
                <small>{e.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ConceptsPanel() {
  return (
    <details className="card concepts">
      <summary>What this prototype does (and does not) prove</summary>
      <dl>
        <dt>Detection · real</dt>
        <dd>MediaPipe finds a face and 478 landmarks. Landmarks describe shape and position, not identity.</dd>
        <dt>Liveness · demo cue only</dt>
        <dd>A blink check. A video of a person can also blink, so this is not secure anti-spoofing.</dd>
        <dt>Recognition · simulated</dt>
        <dd>The match result comes from the "Who is at the tablet?" choice. No real identity is verified yet.</dd>
        <dt>Eligibility · mock data</dt>
        <dd>Account status comes from a synthetic database. The phone app and reception remain as fallbacks.</dd>
      </dl>
    </details>
  )
}
