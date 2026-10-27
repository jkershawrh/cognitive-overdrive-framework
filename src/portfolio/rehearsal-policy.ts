export type RehearsalCondition = 'complete-evidence' | 'missing-evidence' | 'denied-authority'
export type ProofDecision = 'REVIEW_READY' | 'EVIDENCE_REQUIRED' | 'AUTHORITY_REQUIRED'
export type EvidenceKind = 'fraud-score' | 'compliance-decision'

export interface EvidenceReceipt {
  kind: EvidenceKind
  transactionId: string
  available: boolean
}

export interface ReviewPrerequisites {
  transactionId: string
  evidence: EvidenceReceipt[]
  reviewAuthority: 'granted' | 'denied' | 'unknown'
}

export interface ProofRecord {
  id: string
  condition: RehearsalCondition
  decision: ProofDecision
  reason: string
  timestamp: string
  source: 'SIMULATION'
  checks: { evidenceComplete: boolean; reviewAuthorityGranted: boolean }
}

export const conditions: { id: RehearsalCondition; label: string; detail: string }[] = [
  { id: 'complete-evidence', label: 'Complete evidence', detail: 'Two matching records. Review authority granted.' },
  { id: 'missing-evidence', label: 'Missing evidence', detail: 'The compliance record is unavailable.' },
  { id: 'denied-authority', label: 'Denied authority', detail: 'Records are present. Review authority is denied.' },
]

/** A portfolio teaching policy, not a Triforce runtime control or a risk model. */
export function evaluateReviewPrerequisites(input: ReviewPrerequisites): Pick<ProofRecord, 'decision' | 'reason' | 'checks'> {
  const evidenceComplete = input.transactionId.trim().length > 0 && (['fraud-score', 'compliance-decision'] as EvidenceKind[])
    .every(kind => input.evidence.some(receipt => receipt.kind === kind && receipt.transactionId === input.transactionId && receipt.available === true))
  const reviewAuthorityGranted = input.reviewAuthority === 'granted'
  const checks = { evidenceComplete, reviewAuthorityGranted }
  if (!reviewAuthorityGranted) return {
    decision: 'AUTHORITY_REQUIRED',
    reason: 'Stop. Evidence does not confer authority. An explicit grant of review authority is required.',
    checks,
  }
  if (!evidenceComplete) return {
    decision: 'EVIDENCE_REQUIRED',
    reason: 'Hold. Both a fraud-score record and a compliance-decision record must be available for this transaction.',
    checks,
  }
  return {
    decision: 'REVIEW_READY',
    reason: 'Prerequisites satisfied for a review handoff. This does not approve a transaction or execute an action.',
    checks,
  }
}

export function scenarioFor(condition: RehearsalCondition): ReviewPrerequisites {
  return {
    transactionId: 'portfolio-example-001',
    evidence: [
      { kind: 'fraud-score', transactionId: 'portfolio-example-001', available: true },
      { kind: 'compliance-decision', transactionId: 'portfolio-example-001', available: condition !== 'missing-evidence' },
    ],
    reviewAuthority: condition === 'denied-authority' ? 'denied' : 'granted',
  }
}

export function createProofRecord(condition: RehearsalCondition, id: string, timestamp: string): ProofRecord {
  return { id, condition, ...evaluateReviewPrerequisites(scenarioFor(condition)), timestamp, source: 'SIMULATION' }
}

export const decisionLabels: Record<ProofDecision, string> = {
  REVIEW_READY: 'Ready for review',
  EVIDENCE_REQUIRED: 'Held for evidence',
  AUTHORITY_REQUIRED: 'Stopped at authority',
}
