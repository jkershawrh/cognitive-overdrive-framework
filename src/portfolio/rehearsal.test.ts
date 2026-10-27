import { describe, expect, it } from 'vitest'
import { createProofRecord, evaluateReviewPrerequisites, scenarioFor } from './rehearsal-policy'

describe('portfolio review prerequisite contract', () => {
  it('allows only a review handoff when matching evidence and explicit authority are present', () => {
    const result = evaluateReviewPrerequisites(scenarioFor('complete-evidence'))
    expect(result.decision).toBe('REVIEW_READY')
    expect(result.reason).toContain('does not approve a transaction')
  })

  it('holds a request if one required evidence record is unavailable', () => {
    expect(evaluateReviewPrerequisites(scenarioFor('missing-evidence')).decision).toBe('EVIDENCE_REQUIRED')
  })

  it('does not let complete evidence override denied or unknown authority', () => {
    for (const reviewAuthority of ['denied', 'unknown'] as const) {
      const result = evaluateReviewPrerequisites({ ...scenarioFor('complete-evidence'), reviewAuthority })
      expect(result.decision).toBe('AUTHORITY_REQUIRED')
      expect(result.checks.evidenceComplete).toBe(true)
    }
  })

  it('rejects evidence belonging to another transaction', () => {
    const input = scenarioFor('complete-evidence')
    input.evidence[1].transactionId = 'different-transaction'
    expect(evaluateReviewPrerequisites(input).decision).toBe('EVIDENCE_REQUIRED')
  })

  it('cannot replace a missing evidence kind with duplicate records or a blank transaction', () => {
    const input = scenarioFor('complete-evidence')
    input.evidence = [input.evidence[0], input.evidence[0]]
    expect(evaluateReviewPrerequisites(input).decision).toBe('EVIDENCE_REQUIRED')
    expect(evaluateReviewPrerequisites({ ...scenarioFor('complete-evidence'), transactionId: '' }).decision).toBe('EVIDENCE_REQUIRED')
  })

  it('retains provenance and actual supplied time in a downloadable proof record', () => {
    const record = createProofRecord('denied-authority', 'run-1', '2026-10-27T00:00:00.000Z')
    expect(record).toMatchObject({ id: 'run-1', condition: 'denied-authority', source: 'SIMULATION', timestamp: '2026-10-27T00:00:00.000Z', decision: 'AUTHORITY_REQUIRED' })
    expect(record).not.toHaveProperty('latency')
  })
})
