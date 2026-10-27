import { useId, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const root = 'https://github.com/jkershawrh/triforce/blob/c6c17f47c0b9e4750053271514252580ec4ea3d2/'
const questions = [
  {
    question: 'Who turns the request into coordinated work?',
    boundary: 'Coordination ≠ inference',
    answer: 'The Go orchestrator discovers agents through A2A and coordinates workflows. It does not perform inference. The responsibility for an answer stays with the agent doing the work.',
    active: ['request', 'orchestrator', 'agents'],
    paths: ['request-orchestrator', 'orchestrator-agents'],
    source: 'README.md',
    sourceLabel: 'Triforce README · architecture',
  },
  {
    question: 'Which work needs a model, and which needs a tool?',
    boundary: 'Reasoning ≠ deterministic lookup',
    answer: 'Healthcare uses Python/FastAPI; Financial Services uses Java/Quarkus. Model calls flow through LiteLLM to configured serving targets. The MCP gateway exposes eight tools through JSON-RPC 2.0. These are distinct execution paths.',
    active: ['agents', 'models', 'tools'],
    paths: ['agents-models', 'agents-tools'],
    source: 'docs/whitepaper-external.md',
    sourceLabel: 'Architecture and serving model',
  },
  {
    question: 'How can someone inspect what happened?',
    boundary: 'An answer needs a record',
    answer: 'Kafka contracts define fraud-score and compliance-decision events, while orchestrator.workflows records workflow transitions. PostgreSQL stores audit data. Those records make the work traceable; their presence alone does not establish correctness.',
    active: ['agents', 'orchestrator', 'evidence'],
    paths: ['agents-evidence', 'orchestrator-evidence'],
    source: 'contracts/asyncapi/finserv-events.yaml',
    sourceLabel: 'Financial Services event contracts',
  },
  {
    question: 'What should the viewer trust in this room?',
    boundary: 'A walkthrough ≠ a live run',
    answer: 'This diagram explains source-documented responsibilities. It makes no deployment or performance claim. Triforce distinguishes measured, reported, estimated, and roadmap evidence; a live claim requires validation in the named target environment.',
    active: ['request', 'orchestrator', 'agents', 'models', 'tools', 'evidence'],
    paths: ['request-orchestrator', 'orchestrator-agents', 'agents-models', 'agents-tools', 'agents-evidence', 'orchestrator-evidence'],
    source: 'docs/whitepaper-external.md#benchmark-methodology',
    sourceLabel: 'Triforce evidence methodology',
  },
]

const nodes = [
  { id: 'request', x: 24, y: 44, title: 'Frontend / API', tag: 'THE REQUEST', lines: ['User or workload', 'enters the system'] },
  { id: 'orchestrator', x: 334, y: 44, title: 'Go orchestrator', tag: 'COORDINATE', lines: ['A2A discovery + workflows', 'Zero inference'] },
  { id: 'models', x: 24, y: 248, title: 'Model serving', tag: 'REASON', lines: ['LiteLLM → OVMS / vLLM', 'Configured model targets'] },
  { id: 'agents', x: 334, y: 248, title: 'Domain agents', tag: 'DO THE WORK', lines: ['Healthcare · Python', 'FinServ · Java / Quarkus'] },
  { id: 'tools', x: 24, y: 452, title: 'MCP gateway', tag: 'LOOK UP', lines: ['8 federated tools', 'JSON-RPC 2.0'] },
  { id: 'evidence', x: 334, y: 452, title: 'Events + audit', tag: 'LEAVE A RECORD', lines: ['Kafka · workflow events', 'PostgreSQL · audit data'] },
]

const paths = [
  { id: 'request-orchestrator', d: 'M266 104 H334', label: 'request', x: 300, y: 90 },
  { id: 'orchestrator-agents', d: 'M455 164 V248', label: 'A2A', x: 478, y: 210 },
  { id: 'agents-models', d: 'M334 308 H266', label: 'model API', x: 300, y: 293 },
  { id: 'agents-tools', d: 'M334 338 H300 Q290 338 290 348 V502 Q290 512 280 512 H266', label: 'MCP', x: 270, y: 414 },
  { id: 'agents-evidence', d: 'M455 368 V452', label: 'events', x: 485, y: 415 },
  { id: 'orchestrator-evidence', d: 'M576 104 H594 Q606 104 606 116 V498 Q606 512 592 512 H576', label: '', x: 0, y: 0 },
]

const mono: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }

export interface WalkthroughState { step: number; revealed: boolean; furthest: number; earnedSteps?: number[] }
export const initialWalkthroughState: WalkthroughState = { step: 0, revealed: false, furthest: 0, earnedSteps: [] }

export function Architecture({ onInspect, state, onStateChange }: { onInspect?: () => void; state?: WalkthroughState; onStateChange?: (state: WalkthroughState) => void }) {
  const [localState, setLocalState] = useState<WalkthroughState>(initialWalkthroughState)
  const walkthrough = state ?? localState
  const { step, revealed, furthest } = walkthrough
  const update = (nextState: WalkthroughState) => { setLocalState(nextState); onStateChange?.(nextState) }
  const reducedMotion = useReducedMotion()
  const id = useId().replaceAll(':', '')
  const current = questions[step]
  const earnedSteps = walkthrough.earnedSteps ?? (revealed ? [step] : [])
  const earnedNodes = new Set(['request', ...earnedSteps.flatMap(index => questions[index]?.active ?? [])])
  const earnedPaths = new Set(earnedSteps.flatMap(index => questions[index]?.paths ?? []))
  const isActive = (nodeId: string) => revealed && current.active.includes(nodeId)
  const next = () => {
    const nextStep = (step + 1) % questions.length
    update(nextStep === 0 ? { ...initialWalkthroughState, earnedSteps: [] } : { ...walkthrough, step: nextStep, furthest: Math.max(furthest, nextStep), revealed: false, earnedSteps })
  }
  const reveal = () => { update({ ...walkthrough, revealed: true, earnedSteps: [...new Set([...earnedSteps, step])] }); onInspect?.() }

  return <section className="architecture-panel" aria-label="Interactive Triforce architecture walkthrough" style={{ color: '#f4f3ec', background: '#20221f', padding: 'clamp(20px, 4vw, 36px)', borderRadius: 24, overflow: 'hidden' }}>
    <style>{`@media(min-width:901px){.architecture-panel{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:10px 24px;padding:22px!important;overflow:visible!important}.architecture-panel>.architecture-bar{grid-column:1/-1}.architecture-panel>.architecture-question{grid-column:2;grid-row:2;padding:8px 0 12px!important}.architecture-panel .architecture-question h3{font-size:clamp(22px,2vw,30px)!important;margin:7px 0 12px!important}.architecture-panel>figure{grid-column:1;grid-row:2/6;min-height:0;display:flex;flex-direction:column;justify-content:center}.architecture-panel>figure>svg{height:calc(100% - 38px)!important;max-height:410px!important;min-height:0;flex-shrink:1}.architecture-panel>figure>figcaption{font-size:10px!important;line-height:1.5!important;margin:5px 0 0!important}.architecture-panel>.architecture-actions{grid-column:2;grid-row:3;margin-top:0!important}.architecture-panel>.architecture-answer{grid-column:2;grid-row:4;min-height:0!important;margin-top:0!important;align-self:center}.architecture-panel>.architecture-answer>div{padding:13px!important}.architecture-panel>.architecture-answer p{font-size:12px!important;line-height:1.5!important;margin:7px 0!important}.architecture-panel>.architecture-answer strong{font-size:15px!important}.architecture-panel>details{grid-column:2;grid-row:5;font-size:10px!important;max-height:65px;overflow:auto}.architecture-panel>.architecture-bar>span{font-size:9px!important}}`}</style>
    <div className="architecture-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ ...mono, color: '#c8f08b' }}>TRIFORCE · SOURCE WALKTHROUGH</span>
      <span style={{ ...mono, color: '#a8ad9f' }}>Illustrated flow · no live connection</span>
    </div>
    <div className="architecture-question" style={{ borderBottom: '1px solid #41463b', padding: '23px 0 20px' }}>
      <span style={{ ...mono, color: '#a8ad9f' }}>Question {String(step + 1).padStart(2, '0')} / 04</span>
      <h3 style={{ fontSize: 'clamp(24px, 3.2vw, 36px)', lineHeight: 1.15, letterSpacing: '-.04em', maxWidth: 600, margin: '10px 0 16px' }}>{current.question}</h3>
      <div aria-label="Walkthrough progress" style={{ display: 'flex', gap: 6 }}>
        {questions.map((item, index) => <button key={item.question} type="button" disabled={index > furthest} aria-label={`Question ${index + 1}: ${item.question}`} aria-current={index === step ? 'step' : undefined} onClick={() => update({ ...walkthrough, step: index, revealed: false })} style={{ width: 42, height: 5, border: 0, borderRadius: 4, padding: 0, background: index === step ? '#c8f08b' : index <= furthest ? '#7d886a' : '#464c40', cursor: index <= furthest ? 'pointer' : 'default' }} />)}
      </div>
    </div>

    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 630 605" role="img" aria-labelledby={`${id}-title ${id}-desc`} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 590 }}>
        <title id={`${id}-title`}>Triforce request, execution, and evidence boundaries</title>
        <desc id={`${id}-desc`}>Revealed components: {nodes.filter(node => earnedNodes.has(node.id)).map(node => node.title).join(', ')}. Additional components appear only when their question is answered. Highlighted connections illustrate the currently revealed answer.</desc>
        <defs>
          <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#505749" opacity=".45" /></pattern>
          <marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="#a6c581" strokeWidth="1.2" /></marker>
          <linearGradient id={`${id}-node`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#343e2c" /><stop offset="1" stopColor="#262d22" /></linearGradient>
        </defs>
        <rect x="0" y="20" width="630" height="565" fill={`url(#${id}-grid)`} />
        {paths.map(path => {
          if (!earnedPaths.has(path.id) || !path.id.split('-').every(nodeId => earnedNodes.has(nodeId))) return null
          const active = revealed && current.paths.includes(path.id)
          return <g key={path.id}>
            <path d={path.d} fill="none" stroke={active ? '#b5d88b' : '#4d5447'} strokeWidth={active ? 2 : 1.3} strokeDasharray={path.id.includes('tools') ? '4 5' : undefined} markerEnd={active ? `url(#${id}-arrow)` : undefined} opacity={active ? .85 : .65} />
            {active && !reducedMotion && <motion.path d={path.d} fill="none" stroke="#dcffad" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 23" animate={{ strokeDashoffset: [0, -58] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }} />}
            {path.label && <text x={path.x} y={path.y} textAnchor="middle" fill={active ? '#d7e7c2' : '#89967b'} fontSize="12" fontFamily="ui-monospace, monospace">{path.label}</text>}
          </g>
        })}
        {nodes.map(node => {
          if (!earnedNodes.has(node.id)) return <rect key={node.id} aria-hidden="true" x={node.x} y={node.y} width="242" height="120" rx="14" fill="none" stroke="#424b3b" strokeWidth="1" strokeDasharray="4 7" opacity=".45" />
          const active = isActive(node.id)
          return <motion.g key={node.id} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: active || earnedSteps.length === 0 ? 1 : .48 }} transition={{ duration: reducedMotion ? 0 : .35 }}>
            <rect x={node.x} y={node.y + 5} width="242" height="120" rx="14" fill="#10130e" opacity=".4" />
            <rect x={node.x} y={node.y} width="242" height="120" rx="14" fill={active ? `url(#${id}-node)` : '#292d26'} stroke={active ? '#b9db91' : '#525a49'} strokeWidth={active ? 1.7 : 1} />
            <circle cx={node.x + 222} cy={node.y + 22} r="4" fill={active ? '#cdf197' : '#68735b'} />
            <text x={node.x + 18} y={node.y + 25} fill={active ? '#c8f08b' : '#a7b19b'} fontSize="10" letterSpacing="1.1" fontFamily="ui-monospace, monospace">{node.tag}</text>
            <text x={node.x + 18} y={node.y + 53} fill="#f4f3ec" fontSize="21" fontWeight="600" letterSpacing="-.6" fontFamily="inherit">{node.title}</text>
            {node.lines.map((line, index) => <text key={line} x={node.x + 18} y={node.y + 79 + index * 19} fill="#b8c1ae" fontSize="12.5" fontFamily="inherit">{line}</text>)}
          </motion.g>
        })}
      </svg>
      <figcaption style={{ marginTop: -4, color: '#a3ac98', fontSize: 11, lineHeight: 1.6 }}>One source-documented route, simplified for explanation. Direct agent/API entry points and deployment details are omitted. Moving signals illustrate relationships; they are not runtime telemetry.</figcaption>
    </figure>

    <div className="architecture-actions" style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" onClick={reveal} disabled={revealed} style={{ font: 'inherit', fontWeight: 650, padding: '12px 18px', borderRadius: 100, border: '1px solid #c8f08b', background: revealed ? 'transparent' : '#c8f08b', color: revealed ? '#c8f08b' : '#20271a', cursor: revealed ? 'default' : 'pointer' }}>{revealed ? 'Boundary revealed' : 'Reveal boundary'} <span aria-hidden="true">↗</span></button>
      <button type="button" onClick={next} disabled={!revealed} style={{ font: 'inherit', padding: '12px 18px', borderRadius: 100, border: '1px solid #525a49', color: revealed ? '#f4f3ec' : '#7b8471', background: 'transparent', cursor: revealed ? 'pointer' : 'default' }}>{step === questions.length - 1 ? 'Restart questions' : 'Next question'} <span aria-hidden="true">→</span></button>
    </div>

    <div className="architecture-answer" aria-live="polite" aria-atomic="true" style={{ minHeight: 150, marginTop: 20 }}>
      <AnimatePresence mode="wait">
        {revealed ? <motion.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }} style={{ padding: 18, borderLeft: '3px solid #c5a4f3', borderRadius: '0 12px 12px 0', background: '#2b2930' }}>
          <strong style={{ color: '#d9c5f5', fontSize: 17 }}>{current.boundary}</strong>
          <p style={{ color: '#c5c6bd', fontSize: 13, lineHeight: 1.65, margin: '8px 0 12px' }}>{current.answer}</p>
          <a href={`${root}${current.source}`} target="_blank" rel="noreferrer" style={{ color: '#c8f08b', fontSize: 11, textUnderlineOffset: 4 }}>Source: {current.sourceLabel} ↗</a>
        </motion.div> : <p style={{ color: '#a3ac98', fontSize: 13, lineHeight: 1.7, padding: '14px 0' }}>Start with the audience’s question. Reveal the boundary that answers it, then follow the next question.</p>}
      </AnimatePresence>
    </div>
    <details style={{ color: '#a3ac98', fontSize: 11, lineHeight: 1.8 }}>
      <summary style={{ cursor: 'pointer' }}>Source notes</summary>
      <p>Based on the local Triforce README, external whitepaper, and AsyncAPI contracts. The semantic router classifies request complexity; it is not drawn as a mandatory hop in every agent call. Model targets depend on configuration.</p>
      <a href={`${root}contracts/asyncapi/orchestrator-events.yaml`} target="_blank" rel="noreferrer" style={{ color: '#c8f08b' }}>Workflow event contract ↗</a>
    </details>
  </section>
}
