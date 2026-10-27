import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { conditions, createProofRecord, decisionLabels, scenarioFor, type ProofRecord, type RehearsalCondition } from './rehearsal-policy'

export type { ProofRecord } from './rehearsal-policy'

interface RehearsalProps {
  onRecord: (record: ProofRecord) => void
  records?: ProofRecord[]
}

const mono: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, letterSpacing: '.09em', textTransform: 'uppercase' }
const button: CSSProperties = { font: 'inherit', borderRadius: 100, border: '1px solid #51534e', padding: '12px 18px', cursor: 'pointer', color: '#f4f3ec', background: 'transparent' }

export function Rehearsal({ onRecord, records }: RehearsalProps) {
  const [condition, setCondition] = useState<RehearsalCondition>(() => records?.at(-1)?.condition ?? 'complete-evidence')
  const [localRecords, setLocalRecords] = useState<ProofRecord[]>([])
  const [latest, setLatest] = useState<ProofRecord | null>(() => records?.at(-1) ?? null)
  const reducedMotion = useReducedMotion()
  const history = records ?? localRecords
  const scenario = scenarioFor(condition)
  const run = () => {
    const record = createProofRecord(condition, globalThis.crypto.randomUUID(), new Date().toISOString())
    setLatest(record)
    setLocalRecords(previous => [...previous, record])
    onRecord(record)
  }
  const download = () => {
    const content = { title: 'Cognitive Overdrive · review prerequisite rehearsal', source: 'SIMULATION', policy: 'Portfolio teaching policy. Browser-only deterministic evaluation; no Triforce runtime, model, infrastructure, or transaction is invoked.', records: history }
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cognitive-overdrive-rehearsal.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="rehearsal-panel" aria-label="Browser proof rehearsal" style={{ background: '#20221f', color: '#f4f3ec', borderRadius: 24, padding: 'clamp(20px, 4vw, 36px)', overflow: 'hidden' }}>
    <style>{`@media(min-width:901px){.rehearsal-panel{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:18px 28px;padding:22px!important;overflow:visible!important}.rehearsal-panel>.rehearsal-bar{grid-column:1/-1}.rehearsal-bar>span{font-size:9px!important}.rehearsal-input,.rehearsal-output{min-width:0;min-height:0}.rehearsal-input>h3{font-size:27px!important;margin:0 0 10px!important}.rehearsal-input>p{font-size:12px!important;line-height:1.6!important;margin-bottom:16px!important}.rehearsal-input>fieldset{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}.rehearsal-input>fieldset>legend{font-size:9px!important;margin-bottom:8px!important}.rehearsal-input>fieldset>label{padding:12px!important}.rehearsal-input>fieldset strong{font-size:12px!important}.rehearsal-input>fieldset>label>span{font-size:10px!important;line-height:1.5!important}.rehearsal-input>.rehearsal-contract{margin:16px 0!important;padding:15px 0!important;gap:8px!important;grid-template-columns:repeat(3,minmax(0,1fr))!important}.rehearsal-input>.rehearsal-contract strong{font-size:11px!important}.rehearsal-input>.rehearsal-contract>div>span{font-size:8px!important}.rehearsal-output{border-left:1px solid #44483e;padding-left:28px;display:flex;flex-direction:column;justify-content:center}.rehearsal-output>.rehearsal-result{min-height:0!important;margin-top:0!important}.rehearsal-output>.rehearsal-history{margin-top:16px!important}.rehearsal-output>.rehearsal-history ol{max-height:130px!important}.rehearsal-output>p{font-size:10px!important;line-height:1.5!important;margin-top:14px!important}}`}</style>
    <div className="rehearsal-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ ...mono, color: '#d4f59a' }}>SIMULATION · runs in this browser</span>
      <span style={{ ...mono, color: '#a5a79e' }}>No model or infrastructure called</span>
    </div>
    <div className="rehearsal-input"><h3 style={{ fontSize: 'clamp(25px, 3vw, 38px)', letterSpacing: '-.045em', lineHeight: 1.1, margin: '24px 0 12px' }}>Change the condition.<br />Keep the boundary.</h3>
    <p style={{ maxWidth: 620, color: '#c0c2b8', lineHeight: 1.6, marginBottom: 24 }}>A portfolio teaching policy inspired by Triforce’s evidence records. A review handoff requires both matching records and explicit review authority.</p>

    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10 }}>
      <legend style={{ ...mono, marginBottom: 12, color: '#a5a79e' }}>Choose a condition</legend>
      {conditions.map(item => <label key={item.id} style={{ cursor: 'pointer', display: 'block', padding: 16, border: `1px solid ${condition === item.id ? '#c8f08b' : '#44483e'}`, borderRadius: 12, background: condition === item.id ? '#303829' : '#262924' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="radio" name="rehearsal-condition" value={item.id} checked={condition === item.id} onChange={() => { setCondition(item.id); setLatest(null) }} style={{ accentColor: '#c8f08b', margin: 0 }} /><strong style={{ fontSize: 14 }}>{item.label}</strong></div>
        <span style={{ display: 'block', fontSize: 12, lineHeight: 1.6, color: '#b6bbae', marginTop: 8 }}>{item.detail}</span>
      </label>)}
    </fieldset>

    <div className="rehearsal-contract" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, margin: '25px 0', padding: '20px 0', borderTop: '1px solid #44483e', borderBottom: '1px solid #44483e' }}>
      {[
        ['01 · FRAUD SCORE', true, 'Record available'],
        ['02 · COMPLIANCE', scenario.evidence[1].available, scenario.evidence[1].available ? 'Record available' : 'Record missing'],
        ['03 · AUTHORITY', scenario.reviewAuthority === 'granted', scenario.reviewAuthority === 'granted' ? 'Review granted' : 'Review denied'],
      ].map(([label, passed, detail]) => <div key={String(label)}><span style={{ ...mono, color: '#a5a79e', fontSize: 10 }}>{label}</span><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, color: passed ? '#d4f59a' : '#d7c2fc' }}><span aria-hidden="true">{passed ? '●' : '○'}</span><strong style={{ fontSize: 14 }}>{detail}</strong></div></div>)}
    </div>

    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={run} style={{ ...button, background: '#c8f08b', borderColor: '#c8f08b', color: '#1d2418', fontWeight: 650 }}>Run policy check <span aria-hidden="true">↗</span></button>
      <span style={{ fontSize: 12, color: '#a5a79e' }}>Deterministic prerequisites. No risk score generated.</span>
    </div>
    </div>

    <div className="rehearsal-output"><div className="rehearsal-result" aria-live="polite" aria-atomic="true" style={{ minHeight: 124, marginTop: 22 }}>
      <AnimatePresence mode="wait">
        {latest ? <motion.div key={latest.id} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }} style={{ padding: 20, background: latest.decision === 'REVIEW_READY' ? '#303829' : '#302c38', borderRadius: 12, borderLeft: `3px solid ${latest.decision === 'REVIEW_READY' ? '#c8f08b' : '#c5a4f3'}` }}>
          <span style={{ ...mono, color: '#a5a79e' }}>SIMULATION RESULT</span>
          <strong style={{ display: 'block', fontSize: 22, margin: '6px 0', letterSpacing: '-.025em' }}>{decisionLabels[latest.decision]}</strong>
          <p style={{ margin: 0, color: '#c5c8bd', fontSize: 13, lineHeight: 1.6 }}>{latest.reason}</p>
        </motion.div> : <div style={{ padding: 20, border: '1px dashed #4b5044', borderRadius: 12, color: '#a5a79e', fontSize: 13, lineHeight: 1.7 }}>Run a condition to produce a record. Then change one prerequisite and compare what the policy permits.</div>}
      </AnimatePresence>
    </div>

    {history.length > 0 && <div className="rehearsal-history" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ ...mono, color: '#c6cbbf' }}>Session evidence · {history.length} {history.length === 1 ? 'run' : 'runs'}</span>
        <button type="button" onClick={download} style={{ ...button, padding: '8px 12px', fontSize: 12 }}>Download JSON ↓</button>
      </div>
      <ol aria-label="Compare rehearsal records" style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {[...history].reverse().map(record => <li key={record.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 12, padding: '10px 12px', background: '#292d26', borderRadius: 8 }}>
          <span style={{ color: '#c4c9bc' }}>{conditions.find(item => item.id === record.condition)?.label}</span>
          <strong style={{ color: record.decision === 'REVIEW_READY' ? '#d4f59a' : '#d7c2fc' }}>{decisionLabels[record.decision]}</strong>
          <time dateTime={record.timestamp} style={{ color: '#989f90', fontVariantNumeric: 'tabular-nums' }}>{new Date(record.timestamp).toLocaleTimeString()}</time>
        </li>)}
      </ol>
    </div>}
    <p style={{ color: '#959d8e', lineHeight: 1.6, fontSize: 11, margin: '18px 0 0' }}>This policy belongs to the portfolio. It demonstrates prerequisite checks; it is not a claim about Triforce’s production authorization behavior. Records describe this session only.</p>
    </div>
  </section>
}
