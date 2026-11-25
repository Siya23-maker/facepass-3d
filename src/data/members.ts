import type { Member, MembershipStatus, Scenario } from '../types'

// SYNTHETIC membership database.
// Every person here is invented. No real member data is used in this prototype.
// Later this could be replaced by a call to the gym's membership/billing system.

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm-001',
    fullName: 'Thandi Mokoena',
    memberNo: 'GA-104233',
    plan: 'Premium · 12 months',
    status: 'active',
    expiresOn: '2027-03-31',
    paymentDueOn: '2026-12-01',
    initials: 'TM',
    avatarColor: '#16a34a',
  },
  {
    id: 'm-002',
    fullName: 'Johan van Wyk',
    memberNo: 'GA-100871',
    plan: 'Classic · Month-to-month',
    status: 'expired',
    expiresOn: '2026-10-31',
    paymentDueOn: '2026-11-01',
    initials: 'JW',
    avatarColor: '#d97706',
  },
  {
    id: 'm-003',
    fullName: 'Aisha Patel',
    memberNo: 'GA-102519',
    plan: 'Off-peak · 6 months',
    status: 'active',
    expiresOn: '2027-01-15',
    paymentDueOn: '2026-12-01',
    initials: 'AP',
    avatarColor: '#0284c7',
  },
]

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Eligible',
  reminder: 'Payment reminder',
  overdue: 'Missed payment',
  expired: 'Expired',
}

// Each scenario fixes what the (simulated) recognition model "returns".
// The dashboard labels this clearly as SIMULATED so nobody thinks a real
// identity check has been performed.
export const SCENARIOS: Scenario[] = [
  {
    id: 'thandi',
    label: 'Thandi Mokoena (member)',
    description: 'Strong match to an enrolled member. Her account status decides the outcome.',
    simulatedMatch: { memberId: 'm-001', score: 0.94 },
  },
  {
    id: 'johan',
    label: 'Johan van Wyk (member)',
    description: 'Strong match to an enrolled member whose membership has expired.',
    simulatedMatch: { memberId: 'm-002', score: 0.91 },
  },
  {
    id: 'unknown-visitor',
    label: 'Unknown visitor',
    description: 'Face is not close to any enrolled member template.',
    simulatedMatch: { memberId: null, score: 0.37 },
  },
  {
    id: 'low-confidence',
    label: 'Unclear match (verification fails)',
    description: 'Closest template is Aisha Patel, but the score is too low to be sure.',
    simulatedMatch: { memberId: 'm-003', score: 0.66 },
  },
]
