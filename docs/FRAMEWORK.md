# Adapt the story, keep the experience

This repository is an application template for teams who need a repeatable, guided technical story. The current story is Jonathan Kershaw’s portfolio; the engine handles the presentation mechanics around it.

## The separation

`src/demo.config.ts` is the canonical content entry point. It currently reexports the story from `src/portfolio/story.ts` as `demoConfig`.

The story data owns identity, the closing statement, contact link, chapter labels and presenter notes, four audience lenses and the project library. Project cards explain the audience, implementation, workflow, consumption, reusable capability and maturity. They have optional public source links.

The engine owns navigation and URL chapter state, audience selection, case inspection, search/filter dialogs, presenter notes, fullscreen controls, narration controls, the closing view and session observations. The default engine renders seven portfolio scene archetypes.

Specialized components implement the architecture walkthrough, browser simulation and case artwork. Images, fonts and audio live in `public/`. Evidence provenance lives in `data/` and is kept separate from display copy.

The stable import surface is `src/framework.ts`:

```ts
import {
  PortfolioEngine,
  Architecture,
  Rehearsal,
  type StoryPackage,
  type ChapterContext,
  type Project,
} from './framework'
```

There is no published framework package or multi-tenant content service. Reuse starts by adapting this repository.

## Choose the story before the visuals

Use the seven acts to organize a decision:

1. **Ordinary world:** what the audience is trying to accomplish.
2. **Call to adventure:** why the current approach needs to change.
3. **Meeting the guide:** the demonstrated capability that makes the next step credible.
4. **Crossing the threshold:** the system and boundaries the viewer needs to understand.
5. **Trials:** a controlled change, failure or objection that tests the claim.
6. **Reward:** what becomes reusable after the initial demonstration.
7. **Return:** the decision, artifact or action the viewer takes away.

The customer or learner is the hero. The presenter earns trust by making the mechanism legible and keeping evidence limits visible. Campbell provides the narrative shape; the audience should not need to recognize the terminology.

For each act, write one audience question, one claim, the evidence that supports it and the next decision. Put the presenter's prompt in `Chapter.note`. Avoid a scene that contains every detail simply because the implementation has it.

## Swap the story package

1. Copy [examples/minimal-story.ts](../examples/minimal-story.ts) into a new data module under `src/`.
2. Replace the identity, statement, contact URL and case copy. Keep claims specific to evidence you can show.
3. Keep seven chapters and the audience IDs `executive`, `architect`, `sales` and `internal` for the default engine. IDs must be unique; every audience project reference must resolve.
4. Select up to six opening cases by placing them first in `projects`. The built-in portfolio recognizes its six named showcase IDs and orders those by audience relevance; a replacement package uses its first six cases. Other cases remain available through the directory.
5. Set `src/demo.config.ts` to reexport the new package:

```ts
export { story as demoConfig } from './my-story'
```

6. Add the new transcripts/audio and update `public/narration/manifest.json` so every `Chapter.narration` ID resolves to the correct chapter.
7. Update the evidence inventory, then run `npm run check` and inspect the presentation at desktop and mobile sizes.

The five directory categories are **Applied AI**, **Platforms**, **Enablement**, **Governance** and **Research**. If another application needs a different taxonomy, update the validator together with the story.

The minimal example contains illustrative content and deliberately references new narration IDs. It is an authoring example, not a claim that matching audio has already been generated.

## Replace a chapter without copying the engine

`PortfolioEngine` accepts an optional `renderChapter` callback. Return a React node for a custom scene, or `undefined` to keep the default scene.

```tsx
import { PortfolioEngine, type ChapterContext } from './framework'
import { demoConfig } from './demo.config'

function CustomerArchitecture({ navigate }: ChapterContext) {
  return (
    <section aria-label="Customer system walkthrough">
      <p>Source walkthrough</p>
      <h1>Where does the request cross a trust boundary?</h1>
      <p>Replace this explanation with the system's documented contract.</p>
      <button onClick={() => navigate(4)}>Test the next condition</button>
    </section>
  )
}

export default function App() {
  return (
    <PortfolioEngine
      story={demoConfig}
      renderChapter={context =>
        context.chapter === 3
          ? <CustomerArchitecture {...context} />
          : undefined
      }
    />
  )
}
```

The callback receives the current `story`, numeric `chapter`, selected `audience`, existing simulation `records`, visited project IDs, `navigate(index)` and `inspect(project)`. The engine retains navigation, dialogs and presenter controls around the replacement. Render a child component when the custom scene needs its own hooks.

The default architecture component is specifically a Triforce source walkthrough. The default proof component is specifically a portfolio teaching policy. Replace both when another story needs a different mechanism. A different dataset alone does not make these components domain-neutral.

The current extension context exposes session observations for reading. A custom proof scene should own its state or introduce an explicit state-update contract; it must not silently claim that its results entered the engine's existing simulation history.

## Add or update a project

Each `Project` needs:

- a stable `id`, concise `title`, one category, a short `kicker` and a one-sentence `summary`;
- `audience`, `built`, `workflow`, `consumed` and `reuse` copy that answers a different viewer question;
- a concise `maturity` label with important limits explained in the case copy;
- a six-digit accent color and searchable tags;
- an optional HTTPS `source` link to a public supporting repository;
- optional `media` with a local `poster`, optional silent `clip`, and an honest source-state `label`.

Omit `source` when public access is not confirmed. Do not replace it with a private endpoint or an absolute workstation path. Keep the evidence record in `data/portfolio-evidence.json` aligned with the displayed case.

A useful case says what changed for the viewer and how the mechanism works. A repository's existence is evidence of an implementation, not evidence of adoption, efficacy, revenue or production readiness.

## Adding a live adapter

No live project adapter is wired into the active portfolio. The browser simulation requires no network service and must retain its **SIMULATION** label.

For a future connected proof chapter:

1. Define a typed request/response contract for a single bounded operation.
2. Put credentials and external calls behind a server-side boundary; never bundle credentials into story data or browser assets.
3. Require the response to identify its source state, request/correlation ID, collection time, selected model/provider where relevant and the actual observations that support the claim.
4. Validate the response before presenting it as live. Missing identity, stale evidence, schema errors and unavailable dependencies must produce an explicit unavailable or labeled rehearsal result.
5. Keep fixture data visibly distinct from current-session observations. A successful HTTP response alone does not establish live model, hardware or infrastructure participation.
6. Test the healthy path and at least one meaningful changed or failed condition. Keep current-session records available for inspection and export.
7. Add the scene through `renderChapter`, then update its evidence and operations documentation.

Never promote a rehearsal fixture into a live claim because a service is reachable. Never inherit a different project's performance numbers or certification.

## Narration and assets

`Narration.tsx` reads `/narration/manifest.json` and matches each track by the chapter's narration ID. Tracks provide transcript text and an audio path. The current chapter changes the selected track; playback is user initiated.

The active manifest and narration documentation own voice settings and generation provenance. Do not copy a preset from an older project into the evidence inventory. Regenerate and review narration when the story changes; verify meaning, names, emphasis and chapter boundaries before presenting.

Local asset paths currently assume deployment at the web root. A subpath deployment needs coordinated changes to Vite base configuration, absolute asset references and manifest paths.

The hero is a rendered image with motion. Case artwork combines original project screenshots, silent recorded excerpts and procedural SVG. Media plays inside the case dialog; its source-state label remains visible. Use a custom scene if a story needs an actual Three.js workbench, simulation or other domain-specific visualization. See [the video runbook](VIDEO.md) for voice generation and narrated film export.

## Validation

`node scripts/validate-story.mjs` loads the canonical configuration through its local data-only imports. It checks the seven-act shape, four supported audience lenses, required project fields, unique IDs, cross-references, five categories, safe source URLs and local narration assets when a manifest is present.

You can validate another data module with:

```sh
node scripts/validate-story.mjs src/my-story.ts
```

Keep runtime component imports out of data modules; type-only framework imports are supported. The type check and behavior tests remain necessary alongside data validation.

Before sharing an adapted story, inspect keyboard navigation, chapter deep links, project dialogs, viewport fit, reduced-motion behavior, narration/transcript alignment and the exact labels on every evidence surface.
