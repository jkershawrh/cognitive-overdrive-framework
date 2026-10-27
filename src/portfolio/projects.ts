import type { Project } from './types'
// Public-safe editorial projection of data/portfolio-evidence.json.
// Featured experiences are selected by the active story and engine.
export const projects: Project[] = [
  {
    "id": "cost-aware",
    "title": "Cost-Aware Inference",
    "category": "Applied AI",
    "kicker": "Right-sized compute",
    "summary": "One workload. Three placement policies. A decision grounded in quality and visible cost assumptions.",
    "audience": "C-suite, platform leaders, solution architects, application owners, sales",
    "built": "An interactive presentation and Python proof service compare healthcare or financial-services workloads across CPU, accelerator and heterogeneous paths.",
    "workflow": "Choose Healthcare or Financial Services and model endpoints, run CPU-only, accelerator-only and heterogeneous policies concurrently, then inspect prompts, responses, routing, case-specific evaluation and execution-cost assumptions.",
    "consumed": "A seven-minute decision story, a guided engineering view and alternative creative treatments share the same proof contract. Costs remain an execution proxy; case scores are not general model-quality claims.",
    "reuse": "One typed proof API supports an engineering story, The Great CPU Bake Off and The Ministry of Sensible Compute; workload, presentation and placement policy are separable.",
    "maturity": "Implemented demo",
    "accent": "#d7f44c",
    "tags": [
      "Inference economics",
      "Routing",
      "Evaluation"
    ],
    "source": "https://github.com/jkershawrh/cost-aware-inference-demo"
  },
  {
    "id": "bakeoff",
    "title": "The Great CPU Bake Off",
    "category": "Applied AI",
    "kicker": "Business-first storytelling",
    "summary": "Turn inference placement into a memorable business decision: the recipe, equipment and result that fit the task.",
    "audience": "C-suite, budget owners, sales, solution architects, application teams",
    "built": "A separate seven-act React and Motion experience translates the Cost-Aware proof API into a p\u00e2tisserie competition, with original campaign artwork, progressive architecture and business/technical audience modes.",
    "workflow": "Select a healthcare, financial-services or manufacturing workload; run CPU, accelerator and blended policies concurrently; inspect actual answers and named-case checks; compare measured task time and modeled execution cost.",
    "consumed": "A five-minute business story, interactive presentation and detailed engineering view reuse the same underlying proof. Live, rehearsal and unavailable lanes stay distinct. Recorded films show prior demonstrations; this portfolio does not rerun their results.",
    "reuse": "One source proof contract supports multiple creative treatments and audience depths. Switching the story lens preserves the same session results, source labels, model identities and evidence.",
    "maturity": "Implemented presentation",
    "accent": "#edc995",
    "tags": [
      "Creative direction",
      "Business narrative",
      "React \u00b7 Motion",
      "Inference placement"
    ],
    "source": "https://github.com/jkershawrh/great-cpu-bake-off",
    "media": {
      "poster": "/images/project-bakeoff.png",
      "clip": "/showcase/bakeoff.mp4",
      "label": "Recorded creative treatment \u00b7 prior demonstration"
    }
  },
  {
    "id": "triforce",
    "title": "Triforce",
    "category": "Applied AI",
    "kicker": "Polyglot intelligence",
    "summary": "Connect enterprise workflows to the right model, tool and compute tier.",
    "audience": "C-suite, AI platform leaders, solution architects, developers, sales",
    "built": "Python, Java and Go services, a React experience, MCP tools, semantic routing, selectable optimization modules and hands-on labs connect healthcare and financial-services scenarios.",
    "workflow": "Trace a clinical NLP or financial-services task across Python, Java and Go services; inspect semantic routing, MCP tools, CPU/accelerator placement, workflow evidence and configurable optimization modules.",
    "consumed": "Use a guided demo, an interactive architecture or a hands-on lab. Historical benchmarks retain their named environment; the llm-d module remains roadmap. This portfolio does not run the platform.",
    "reuse": "A common application boundary, contract-first services, selectable modules and parallel business narratives support multiple audiences and industry scenarios.",
    "maturity": "Implemented platform",
    "accent": "#c6b1dd",
    "tags": [
      "Multi-agent systems",
      "MCP",
      "OpenShift",
      "Python \u00b7 Java \u00b7 Go"
    ],
    "source": "https://github.com/jkershawrh/triforce"
  },
  {
    "id": "edge",
    "title": "Edge Inference at Scale",
    "category": "Applied AI",
    "kicker": "Intelligence within reach",
    "summary": "Make useful information reachable when connectivity and compute are constrained.",
    "audience": "public-sector and community stakeholders, solution architects, edge platform teams, sales",
    "built": "A message-to-knowledge pipeline combines privacy filtering, Redis Streams, retrieval, an interchangeable local-model boundary and fleet-oriented deployment assets.",
    "workflow": "Send a simulated message through transport, privacy filtering, Redis Streams, retrieval and optional local inference; route a confident short retrieval result directly, and inspect fleet and node behavior.",
    "consumed": "Explore a conference-assistant demo, inspect the node/fleet architecture or adapt the reference. Development SMS is simulated; BitNet is a baseline, not a selected field model or evidence of real-world efficacy.",
    "reuse": "Transport, corpus, local model provider and operating environment are interchangeable boundaries; conference assistance demonstrates the same pattern proposed for other domains.",
    "maturity": "Reference implementation",
    "accent": "#91b9c1",
    "tags": [
      "Edge inference",
      "RAG",
      "Accessible AI"
    ],
    "source": "https://github.com/jkershawrh/edge-inference-at-scale",
    "media": {
      "poster": "/images/project-edge.png",
      "clip": "/showcase/edge.mp4",
      "label": "Recorded field story \u00b7 illustrative workflow"
    }
  },
  {
    "id": "praxis",
    "title": "Praxis Gateway Lab",
    "category": "Applied AI",
    "kicker": "One application contract",
    "summary": "Three languages. One governed model contract. A backend the platform can change.",
    "audience": "solution architects, application teams, platform teams, security reviewers, sales",
    "built": "A gateway lab and Java, Python and TypeScript clients demonstrate a stable logical-model contract, trace correlation, credential isolation and red-to-green validation.",
    "workflow": "Call one logical model from Java, Python and TypeScript through a platform-managed gateway; inspect trace correlation, backend portability, credential isolation and red-to-green validation.",
    "consumed": "An architect can guide a customer through the proof or hand it into a workshop. Praxis is an upstream project; this lab does not claim authorship of the gateway or product support. Production identity, tenancy and lifecycle controls remain customer design work.",
    "reuse": "A stable OpenAI-compatible application contract and platform-owned routing allow approved model services to change independently of application integrations.",
    "maturity": "Implemented reference",
    "accent": "#edc995",
    "tags": [
      "AI gateway",
      "Polyglot clients",
      "Platform engineering",
      "Credential isolation"
    ],
    "source": "https://github.com/jkershawrh/praxis-lab"
  },
  {
    "id": "launchpad",
    "title": "Launchpad",
    "category": "Platforms",
    "kicker": "Experience delivery",
    "summary": "Turn an effective demonstration into a repeatable organizational capability.",
    "audience": "enablement leaders, instructors, content integrators, platform operators, sales engineering",
    "built": "A self-service lab platform connects catalog intake, individual and workshop provisioning, participant entry points, qualification probes and target-aware reclaim.",
    "workflow": "Request an individual lab or multi-seat workshop, validate each environment before handoff, open a participant entry point, run functional certification probes and reclaim from the persisted execution target.",
    "consumed": "Participants receive a lab; instructors manage a workshop; integrators contribute content; operators review lifecycle evidence. The source documents an internal deployed pilot. Current health, attendance and business value are not measured by this portfolio.",
    "reuse": "Catalog intake, contracts, lifecycle automation, visual guides and staged certification let new experiences use a shared delivery platform.",
    "maturity": "Documented pilot",
    "accent": "#d7f44c",
    "tags": [
      "Self-service labs",
      "Catalogs",
      "Enablement"
    ],
    "source": "https://github.com/rhpds/launchpad"
  },
  {
    "id": "earned-authority",
    "title": "Earned Authority",
    "category": "Governance",
    "kicker": "Qualification to action",
    "summary": "Follow authority from earned qualification through bounded action and selective withdrawal.",
    "audience": "technical leadership, agent platform architects, governance reviewers",
    "built": "An integration kit connects deterministic qualification, Passport, Ledger, Cascade and GCL to bounded grants, mutation fencing, independent readback and requalification.",
    "workflow": "Qualify a deterministic procedure, grant bounded authority, fence mutation, independently read back the result, withdraw a specific permission and require requalification.",
    "consumed": "Run a local reference journey or inspect the cut-paper interpretation of its fixture. Recorded milestones cover local, connected-service and same-host installation behavior. Business-value comparison, independent installation and broader operations gates remain open.",
    "reuse": "Integrates Foundation, Passport, Ledger, Cascade and deterministic GCL through explicit contracts; an independent presentation treatment reuses the same local runtime.",
    "maturity": "Validated local reference",
    "accent": "#c6b1dd",
    "tags": [
      "Bounded authority",
      "Evidence",
      "Requalification",
      "Systems integration"
    ],
    "source": "https://github.com/jkershawrh/earned-authority-kit"
  },
  {
    "id": "stargate",
    "title": "StarGate",
    "category": "Platforms",
    "kicker": "Operational readiness",
    "summary": "Make the learner's experience observable before an infrastructure failure becomes their problem.",
    "audience": "operations leaders, platform engineers, event operators, internal technical leadership",
    "built": "Collectors, readiness rubrics, a React dashboard, durable investigations and a gated remediation catalog connect multiple operational evidence sources.",
    "workflow": "Collect multi-source lab and cluster evidence, evaluate readiness rubrics, classify unfamiliar failures, open durable investigations and gate proposed remediation with auditability.",
    "consumed": "Operators inspect readiness and failure evidence across labs and workshops. Implementation and deployment assets are documented; current fleet health, executed remediation and operational savings were not independently revalidated.",
    "reuse": "Collectors, normalization, readiness rubrics, a remediation catalog and evidence-driven review separate the operating model from a single demo or event.",
    "maturity": "Implemented platform",
    "accent": "#91b9c1",
    "tags": [
      "Operations",
      "Readiness",
      "Observability"
    ],
    "source": "https://github.com/rhpds/stargate"
  },
  {
    "id": "cascade",
    "title": "Cascade Compression",
    "category": "Research",
    "kicker": "Signals to governed rules",
    "summary": "Turn repeated model judgment into inspectable, expiring and reversible rules.",
    "audience": "platform leaders, operations architects, AI engineers, internal technical leadership",
    "built": "A domain-neutral signal engine combines deterministic handling, survivor classification, candidate-rule promotion, shadow checks, demotion and memory boundaries.",
    "workflow": "Normalize input signals, apply deterministic handling, preserve survivors, classify, propose inspectable rules, qualify activation, shadow-check and revoke rules, and retain qualified memory.",
    "consumed": "Run the public service/dashboard or explore contracts and synthetic examples. The public candidate demonstrates mechanics and packaging; private pilot percentages do not qualify this artifact. No production effectiveness or zero-miss claim is made.",
    "reuse": "The domain-neutral Signal protocol, pluggable classifiers, public contracts and governed rule lifecycle separate reusable mechanics from domain-specific judgment.",
    "maturity": "Incubating OSS",
    "accent": "#edc995",
    "tags": [
      "Signal processing",
      "Rule lifecycle",
      "CPU inference"
    ],
    "source": "https://github.com/jkershawrh/cascade-compression"
  },
  {
    "id": "gcl",
    "title": "GCL OSS",
    "category": "Governance",
    "kicker": "Evidence to proposals",
    "summary": "Make observations, constraints and alternatives inspectable before an authority decides.",
    "audience": "AI platform architects, governance engineers, technical leadership",
    "built": "A vendor-neutral kernel validates evidence, derives constraints and objectives, compares proposals, runs falsification checks and signs expiring decision packages.",
    "workflow": "Normalize evaluation evidence, derive constraints and objectives, generate alternatives, falsify a candidate and sign an expiring decision package for a separate authority to review.",
    "consumed": "Use the offline demonstration or inspect EvalHub/TrustyAI adapter qualification. Proposals remain separate from authorization and execution. Durable distributed idempotency and production qualification remain open.",
    "reuse": "Vendor-neutral extension ports support evidence producers, policy, planners, falsification, signatures, proposal consumers and telemetry.",
    "maturity": "Alpha reference kernel",
    "accent": "#d7f44c",
    "tags": [
      "Governance",
      "Signed proposals",
      "EvalHub",
      "TrustyAI"
    ],
    "source": "https://github.com/jkershawrh/gcl-oss"
  },
  {
    "id": "passport",
    "title": "Agent Passport",
    "category": "Governance",
    "kicker": "Bounded permission",
    "summary": "Keep an agent's identity while changing what it is allowed to do.",
    "audience": "agent architects, security engineers, platform teams",
    "built": "A Go service issues, verifies, expires and revokes scoped credentials through explicit registry, signing, policy, event and ledger interfaces.",
    "workflow": "Issue a signed scoped credential, verify its action and resource boundaries, expire or revoke it, and record lifecycle events through explicit integration interfaces.",
    "consumed": "Explore the standalone service, Docker Compose journey or gRPC contract. Demo stubs are distinct from enterprise integrations; scope verification does not replace workload identity or network enforcement.",
    "reuse": "Go interfaces separate identity, signing, registry, policy bundles, outbox and ledger integration from the authorization lifecycle.",
    "maturity": "Implemented reference",
    "accent": "#c6b1dd",
    "tags": [
      "Agent authorization",
      "Go",
      "Revocation"
    ],
    "source": "https://github.com/jkershawrh/agent-passport"
  },
  {
    "id": "ledger",
    "title": "Immutable Ledger",
    "category": "Governance",
    "kicker": "Portable evidence",
    "summary": "Carry reviewable assertions across systems without confusing a receipt with truth.",
    "audience": "platform architects, governance engineers, security reviewers",
    "built": "Rust and PostgreSQL support append-only entries, versioned hash chains, portable proof receipts, correlated queries, SDKs and cross-system adapters.",
    "workflow": "Append an event, issue a portable receipt, verify its canonical hash and chain, query by correlation or source, and inspect linked events across independent writers.",
    "consumed": "Inspect a receipt, replay a demonstration or integrate through gRPC. Receipts establish a submitted assertion and tamper-evidence; they do not prove the assertion occurred or was correct. Historical checks are tied to their original commit and environment.",
    "reuse": "A gRPC evidence contract, versioned proof envelope and adapters allow each producer to retain its own identifiers and event schema.",
    "maturity": "Implemented service",
    "accent": "#91b9c1",
    "tags": [
      "Rust",
      "Evidence receipts",
      "Tamper evidence",
      "gRPC"
    ],
    "source": "https://github.com/jkershawrh/are-immutable-ledger"
  },
  {
    "id": "aeris",
    "title": "AERIS",
    "category": "Research",
    "kicker": "Physical AI, made tangible",
    "summary": "Put the viewer inside an inspection decision with articulated 3D, evidence replay and narration.",
    "audience": "C-suite, manufacturing and aerospace stakeholders, solution architects, sales, technical leadership",
    "built": "A Rust/Axum and React/Three.js concept combines an articulated inspection cell, bounded planning fixtures, failure injection, persistent records, causal diagrams and buyer-specific routes.",
    "workflow": "Introduce an inspection obstruction, compare three bounded rehearsal strategies, inject failure conditions, inspect articulated 3D and architecture views, replay decisions and connect them to a buyer-specific business case.",
    "consumed": "Explore a seven-minute narrated story, a 3D workbench or a scoped-pilot conversation. The interactive runtime connects no physical robot, camera, JEPA model or accelerator. Separate experiments do not establish learned-planning advantage or physical inspection qualification.",
    "reuse": "Seven-minute story, causal diagrams, 3D picking, evidence replay, audience routes and a synchronized Kersh narration connect one technical mechanism to multiple decision makers.",
    "maturity": "Runnable concept",
    "accent": "#edc995",
    "tags": [
      "3D storytelling",
      "Rust",
      "Evidence replay",
      "Physical AI"
    ],
    "media": {
      "poster": "/images/project-aeris.png",
      "label": "AERIS concept rehearsal \u00b7 no connected robot"
    }
  },
  {
    "id": "sovereign-ai-101",
    "title": "Sovereign AI 101",
    "category": "Enablement",
    "kicker": "Verify the request",
    "summary": "Trace the answer, policy and evidence before expanding the claim.",
    "audience": "solution architects, platform engineers, security reviewers, technical decision makers",
    "built": "Implemented presentation and service source; reviewed discovery documents describe source limitations and do not certify live deployment.",
    "workflow": "Trace a request across input, policy, model, evidence and human review; compare ordinary and injection-pattern inputs. The source blueprint identifies fail-open and evidence limitations in the upstream lab; do not claim residency or confidential execution from labels.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "A progressive seven-scene story, typed qualification contract, separate Showroom lab and evidence-aware handoff provide a repeatable way to turn a domain into an enablement journey.",
    "maturity": "Rehearsal candidate",
    "accent": "#d7f44c",
    "tags": [
      "Sovereign AI",
      "Evidence",
      "Foundations"
    ],
    "source": "https://github.com/jkershawrh/sovereign-ai-101"
  },
  {
    "id": "sovereign-ai-201",
    "title": "Sovereign AI 201",
    "category": "Enablement",
    "kicker": "Build the boundary",
    "summary": "Let the learner build, break and qualify a governed inference boundary.",
    "audience": "solution architects, platform engineers, security reviewers, technical decision makers",
    "built": "Factory candidate with deterministic rehearsal, presentation and 75\u201390 minute Showroom lab.",
    "workflow": "Author contracts, Secret references, Service and NetworkPolicy; qualify allowed, denied, malformed, injection-blocked and unavailable cases. LIVE inference requires runtime identities and dependencies; no certification or confidential-execution claim.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "A progressive seven-scene story, typed qualification contract, separate Showroom lab and evidence-aware handoff provide a repeatable way to turn a domain into an enablement journey.",
    "maturity": "Factory candidate",
    "accent": "#c6b1dd",
    "tags": [
      "Sovereign AI",
      "Contracts",
      "Hands-on lab"
    ],
    "source": "https://github.com/jkershawrh/sovereign-ai-201"
  },
  {
    "id": "sovereign-ai-301",
    "title": "Sovereign AI 301",
    "category": "Enablement",
    "kicker": "Reveal the trust chain",
    "summary": "Separate attestation, key release, inference permission and human authority.",
    "audience": "solution architects, platform engineers, security reviewers, technical decision makers",
    "built": "Published signed noncertified REHEARSAL candidates; deterministic qualifier and independent lab.",
    "workflow": "Inspect a synthetic hardware-to-attestation-to-policy-gated-resource trust chain. No current TDX quote, confidential runtime or live model execution is established.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "A progressive seven-scene story, typed qualification contract, separate Showroom lab and evidence-aware handoff provide a repeatable way to turn a domain into an enablement journey.",
    "maturity": "Rehearsal candidate",
    "accent": "#91b9c1",
    "tags": [
      "Confidential AI",
      "Attestation",
      "Intel TDX"
    ],
    "source": "https://github.com/jkershawrh/sovereign-ai-301"
  },
  {
    "id": "sovereign-ai-401",
    "title": "Sovereign AI 401",
    "category": "Enablement",
    "kicker": "Operate the trust chain",
    "summary": "Keep confidential-runtime evidence reviewable as measurements change or expire.",
    "audience": "solution architects, platform engineers, security reviewers, technical decision makers",
    "built": "Factory implementation with deterministic passing REHEARSAL journey; not certified, orderable or promoted.",
    "workflow": "Verify supplied runtime identity, appraise TDX evidence, bind protected access to approved measurements and refuse stale or mismatched evidence. LIVE requires a confidential guest and current verified quote; host capability is insufficient.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "A progressive seven-scene story, typed qualification contract, separate Showroom lab and evidence-aware handoff provide a repeatable way to turn a domain into an enablement journey.",
    "maturity": "Rehearsal candidate",
    "accent": "#edc995",
    "tags": [
      "Confidential AI",
      "Operations",
      "Trust"
    ],
    "source": "https://github.com/jkershawrh/sovereign-ai-401"
  },
  {
    "id": "sovereign-ai-501",
    "title": "Sovereign AI 501",
    "category": "Enablement",
    "kicker": "Qualify the fleet",
    "summary": "Show what must stay true across a fleet before authority can expand.",
    "audience": "solution architects, platform engineers, security reviewers, technical decision makers",
    "built": "Factory candidate; included results are REHEARSAL with separate presentation and lab.",
    "workflow": "Exercise policy rollout, freshness, revocation, dependency failure, correlated evidence, concurrency and human promotion review. No live TDX guests, Trustee/KBS, resource release or model execution is directly observed by the included runtime.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "A progressive seven-scene story, typed qualification contract, separate Showroom lab and evidence-aware handoff provide a repeatable way to turn a domain into an enablement journey.",
    "maturity": "Rehearsal candidate",
    "accent": "#d7f44c",
    "tags": [
      "Confidential AI",
      "Fleet qualification",
      "Evidence"
    ],
    "source": "https://github.com/jkershawrh/sovereign-ai-501"
  },
  {
    "id": "virtualization-ai-foundations",
    "title": "Virtualization + AI Foundations",
    "category": "Enablement",
    "kicker": "Connect the existing estate",
    "summary": "Trace a VM application's request to governed inference and a human decision.",
    "audience": "C-suite, solution architects, VM platform engineers, application owners",
    "built": "Level-101 candidate with seven-scene presentation, 60\u201375 minute lab, adapter, Helm and signed artifact pipeline.",
    "workflow": "Trace a VM application request through Service and validation adapter to an approved inference endpoint and back to a human decision owner. Default runtime is rehearsal; endpoint/model/provider/hardware declarations are required before live claims.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "Shared narrative cadence and typed evidence contract extend from one request to construction, operation and fleet qualification while preserving separate learner work and human authority.",
    "maturity": "Rehearsal candidate",
    "accent": "#c6b1dd",
    "tags": [
      "Virtualization",
      "AI integration",
      "Foundations"
    ],
    "source": "https://github.com/jkershawrh/virtualization-ai-foundations"
  },
  {
    "id": "virtualization-ai-201",
    "title": "Virtualization + AI 201",
    "category": "Enablement",
    "kicker": "Build the application contract",
    "summary": "Turn an architecture lesson into an integration the learner can defend.",
    "audience": "C-suite, solution architects, VM platform engineers, application owners",
    "built": "Level-201 factory candidate with reference runtime, separate build lab and explicit red-to-green construction work.",
    "workflow": "Author contracts and a VM client, wire references and allow-list networking, qualify healthy/unavailable behavior and produce an evidence map and cleanup receipt. Model cannot mutate infrastructure, approve promotion or certify its output; rehearsal is visibly labeled.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "Shared narrative cadence and typed evidence contract extend from one request to construction, operation and fleet qualification while preserving separate learner work and human authority.",
    "maturity": "Factory candidate",
    "accent": "#91b9c1",
    "tags": [
      "Virtualization",
      "Contracts",
      "Hands-on lab"
    ],
    "source": "https://github.com/jkershawrh/virtualization-ai-201"
  },
  {
    "id": "virtualization-ai-301",
    "title": "Virtualization + AI 301",
    "category": "Enablement",
    "kicker": "Qualify the modernization path",
    "summary": "Inspect identity, networking and placement alongside the model's answer.",
    "audience": "C-suite, solution architects, VM platform engineers, application owners",
    "built": "Level-301 deterministic factory candidate; read-only cluster inventory is documented, no 301 workload deployment claimed.",
    "workflow": "Evaluate workload identity, declared-versus-observed placement, correlated evidence and ALLOW_REVIEW/REFUSE/ABSTAIN outcomes. Factory results do not prove live VM/network/inference/Intel placement; no cost, performance or migration claim.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "Shared narrative cadence and typed evidence contract extend from one request to construction, operation and fleet qualification while preserving separate learner work and human authority.",
    "maturity": "Rehearsal candidate",
    "accent": "#edc995",
    "tags": [
      "Virtualization",
      "Placement evidence",
      "Governed AI"
    ],
    "source": "https://github.com/jkershawrh/virtualization-ai-301"
  },
  {
    "id": "virtualization-ai-401",
    "title": "Virtualization + AI 401",
    "category": "Enablement",
    "kicker": "Preserve the service",
    "summary": "Make day-two operations a story of continuity, evidence and deliberate recovery.",
    "audience": "C-suite, solution architects, VM platform engineers, application owners",
    "built": "Level-401 rehearsal candidate; durable seven-state evidence journey, no infrastructure mutation.",
    "workflow": "Inspect readiness, choose a governed day-two action, evaluate continuity and stop or recover when evidence is incomplete. Not orderable/certified/promoted; actual migration, recovery and external action remain human approved.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "Shared narrative cadence and typed evidence contract extend from one request to construction, operation and fleet qualification while preserving separate learner work and human authority.",
    "maturity": "Rehearsal candidate",
    "accent": "#d7f44c",
    "tags": [
      "Virtualization",
      "Operations",
      "Continuity"
    ],
    "source": "https://github.com/jkershawrh/virtualization-ai-401"
  },
  {
    "id": "virtualization-ai-501",
    "title": "Virtualization + AI 501",
    "category": "Enablement",
    "kicker": "Qualify the inference fleet",
    "summary": "Connect fleet scale to directly evidenced placement, containment and review.",
    "audience": "C-suite, solution architects, VM platform engineers, application owners",
    "built": "Level-501 factory candidate with durable ledger, seven-scene story, separate lab and signed packaging gates.",
    "workflow": "Move through DISCOVER, BASELINE, MIGRATE, DISRUPT, CORRELATE, QUALIFY and HANDOFF using supplied multi-VM evidence. Rehearsal fixture quantities are not production performance; adapter has no mutation, certification or promotion authority.",
    "consumed": "A concise guided presentation leads into a separate Showroom lab and explicit evidence handoff. Factory checks demonstrate the candidate; destination-specific certification, deployment authority and promotion remain separate.",
    "reuse": "Shared narrative cadence and typed evidence contract extend from one request to construction, operation and fleet qualification while preserving separate learner work and human authority.",
    "maturity": "Rehearsal candidate",
    "accent": "#c6b1dd",
    "tags": [
      "Virtualization",
      "Fleet qualification",
      "Capacity"
    ],
    "source": "https://github.com/jkershawrh/virtualization-ai-501"
  },
  {
    "id": "agentic",
    "title": "Agentic AI 101",
    "category": "Enablement",
    "kicker": "Understand the agent loop",
    "summary": "Give a room a shared vocabulary for who proposes, acts, proves and decides.",
    "audience": "solution architects, AI engineers, sales engineering",
    "built": "A seven-scene presentation, typed service, deterministic traces and separate learner journey explain Ask \u2192 Plan \u2192 Use \u2192 Prove \u2192 Decide \u2192 Record.",
    "workflow": "Trace Ask \u2192 Plan \u2192 Use \u2192 Prove \u2192 Decide \u2192 Record across read-only and state-changing rehearsal paths.",
    "consumed": "Begin with a guided explanation, then carry the same mental model into agent construction. Current proof is rehearsal; it does not establish live inference, hardware placement, autonomous action or production readiness. The catalog lifecycle remains draft.",
    "reuse": "One six-part mental model supports a concise presentation, a separate Showroom lab and a handoff to bounded agent construction.",
    "maturity": "Rehearsal candidate",
    "accent": "#91b9c1",
    "tags": [
      "Agent workflows",
      "Learning design",
      "Typed contracts"
    ],
    "source": "https://github.com/jkershawrh/agentic-ai-101"
  },
  {
    "id": "agentic-601",
    "title": "Agentic AI 601",
    "category": "Enablement",
    "kicker": "Earn the right to act",
    "summary": "Make the evidence required for an agent's next action explicit.",
    "audience": "agent platform architects, governance engineers, technical leadership",
    "built": "A presentation, separate lab and deterministic qualification service connect Signal \u2192 Decision \u2192 Action \u2192 Validate \u2192 Learn through authority and evaluation contracts.",
    "workflow": "Trace Signal \u2192 Decision \u2192 Action \u2192 Validate \u2192 Learn, with one synthetic restart, deterministic qualification and automatic demotion on failed validation.",
    "consumed": "Inspect a synthetic restart and its validation or demotion path. Production authority is disabled, external remediation is unimplemented and catalog certification is not earned. Human review owns any increase in authority.",
    "reuse": "Typed authority, evidence and evaluation contracts connect a narrative, lab and qualification service without granting the runtime authority to promote itself.",
    "maturity": "Research candidate",
    "accent": "#edc995",
    "tags": [
      "Agent governance",
      "Qualification",
      "Learning design"
    ],
    "source": "https://github.com/jkershawrh/agentic-ai-601"
  },
  {
    "id": "sovereign",
    "title": "Sovereign AI \u00b7 Sales",
    "category": "Enablement",
    "kicker": "Control what you prove",
    "summary": "Help a buyer choose the AI boundary their organization should validate first.",
    "audience": "C-suite, business leaders, technology leaders, sales",
    "built": "A concise sales-entry presentation connects a business decision, causal architecture, synthetic trust chain, changed conditions and one technical handoff.",
    "workflow": "Follow a business decision, progressive causal architecture, synthetic trust chain, changed measurement and unavailable verifier to one lab handoff.",
    "consumed": "Present a guided buyer conversation and transition into Sovereign AI 101. Synthetic or unavailable evidence remains labeled; the experience makes no live confidential-computing claim. Public source access is not confirmed.",
    "reuse": "A sales-entry layer reuses the technical contract while changing the audience decision and depth.",
    "maturity": "Rehearsal sales story",
    "accent": "#d7f44c",
    "tags": [
      "Sales storytelling",
      "Sovereign AI",
      "Discovery"
    ]
  },
  {
    "id": "virtualization",
    "title": "Virtualization + AI \u00b7 Sales",
    "category": "Enablement",
    "kicker": "Modernize without waiting",
    "summary": "Make a governed AI path visible for the applications an enterprise already depends on.",
    "audience": "C-suite, business leaders, technology leaders, sales",
    "built": "A short sales presentation connects a modernization decision to architecture, workload identity, placement evidence, failure cases and one foundations-lab handoff.",
    "workflow": "Follow a business decision, causal architecture, source-labeled contract, changed identity and missing placement evidence to one foundations-lab handoff.",
    "consumed": "Use the narrative in customer discovery or an internal modernization pitch. Proof uses labeled rehearsal/offline data without its adapter; no savings or migration outcome is established. Public source access is not confirmed.",
    "reuse": "The same technical boundary supports a short sales conversation and deeper architect/learner experiences.",
    "maturity": "Rehearsal sales story",
    "accent": "#c6b1dd",
    "tags": [
      "Sales storytelling",
      "Modernization",
      "Virtualization"
    ]
  }
]
