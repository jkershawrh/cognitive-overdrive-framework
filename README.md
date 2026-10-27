# Cognitive Overdrive

Jonathan Kershaw’s interactive portfolio and a reusable React presentation framework for explaining complex systems through a clear audience decision.

The default experience follows a seven-act adaptation of Joseph Campbell’s hero journey. It connects 27 source-backed cases across Applied AI, Platforms, Enablement, Governance and Research, with four audience lenses: C-suite, solution architects, sales and internal teams.

![Cognitive Overdrive portfolio opening scene](docs/preview.png)

The [first release](https://github.com/jkershawrh/cognitive-overdrive-framework/releases/tag/v0.1.0) includes the narrated film and English captions. This private repository is configured as a GitHub template.

## Run locally

Use Node.js 22.15+ and npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite. The portfolio needs no model endpoint, account credential or running case-study backend.

To validate and build:

```sh
npm run check
npm run test:visual
npm run preview -- --host 127.0.0.1
```

The production output is `dist/`. Serve it from the web root; current asset references begin with `/`. External GitHub source links require network access, while bundled visual and narration assets are served locally.

## The experience

1. **The possibility — ordinary world.** Begin with the human problem and the moment an idea becomes understandable.
2. **The decision — call to adventure.** Choose the audience and the decision the room needs to make.
3. **The work — meeting the guide.** Inspect what was built, who it serves, how it works and what others can reuse.
4. **The architecture — crossing the threshold.** Ask a question before revealing the system boundary that answers it.
5. **The proof — the trials.** Change a prerequisite and inspect a deterministic browser simulation.
6. **The multiplier — the reward.** Show the handoff from one presentation to briefings, demos, architecture and enablement.
7. **The return — return with the elixir.** Leave with a concrete next step and an accurate account of the current session.

The viewer owns the decision. The engineer guides them through the mechanism, evidence and next step.

Use the chapter buttons or **← / →** to navigate, **P** for presenter notes, **F** for fullscreen and **Home** to restart. Project dialogs support search and category filtering. The **CC** control opens the chapter transcript; narration starts only after a user action.

## Reuse the framework

Content, presentation state and assets have separate entry points:

- `src/demo.config.ts` selects the active story.
- `src/portfolio/story.ts` defines identity, seven chapters, presenter notes and audience lenses.
- `src/portfolio/projects.ts` supplies the case library. The work chapter features Bake Off, Edge, AERIS, Triforce, Launchpad and Praxis, ordered by audience lens.
- `src/portfolio/PortfolioEngine.tsx` owns navigation, dialogs, session state and the default scene layouts.
- `src/framework.ts` exports the engine, types and extension components.
- `public/` contains images, fonts and narration assets.
- `data/portfolio-evidence.json` retains dated, public-safe provenance and maturity boundaries.

Start with [the adaptation guide](docs/FRAMEWORK.md) and [the minimal story example](examples/minimal-story.ts). Replace the story configuration for a different audience or body of work. Use the `renderChapter` extension when a chapter needs a different visualization or interaction. The default scenes contain Cognitive Overdrive’s personal portfolio copy and visual identity; a full rebrand also changes those scene treatments and theme assets.

The implementation adapts mechanics from the existing `demo-story-starter` pattern. Cognitive Overdrive supplies this portfolio’s personal identity and presentation treatment. Brand assets retained from earlier demos do not imply an endorsement of the portfolio.

## What runs here

The active application is a static React/Vite experience with motion, an illustrated hero, original project screenshots and recorded excerpts, procedural SVG case artwork, a source-based architecture walkthrough, project exploration, chapter narration and a local prerequisite-check simulation.

The hero artwork is a raster rendering with motion. The portfolio does not render an interactive 3D physical system or run the underlying portfolio projects. AERIS’s 3D workbench is described as a separate project.

Intel, AMD, Arm and NVIDIA form a cross-hardware story with separate evidence levels: documented reference execution, retained historical runs, release packaging and outstanding native qualification. Launchpad makes the organizational handoff explicit: request, provision, validate, participant handoff and reclaim. See the [hardware and delivery evidence](data/hardware-evidence.json).

The first narrated film is **5 minutes 23 seconds**, exported at **1920×1080, 30 fps**, with H.264 video, AAC audio and 73 speech-aligned English caption cues in SRT and WebVTT. It records the actual interface, original project excerpts, architecture reveals and changed-condition simulation. The existing Kersh ElevenLabs v3 voice settings are preserved. See [the video runbook](docs/VIDEO.md) to regenerate narration or render another cut.

The proof chapter performs deterministic checks in the browser. It produces **SIMULATION** records and can export the current session as JSON. It does not invoke a model, a Triforce service, a cluster or a real transaction. Session state is held in memory and resets on a page reload.

See [the evidence guide](docs/EVIDENCE.md) for source states and [the framework guide](docs/FRAMEWORK.md#adding-a-live-adapter) before connecting an external service.

## Maintain the story

Keep case copy and `data/portfolio-evidence.json` aligned. Preserve the distinction between implemented services, reference implementations, rehearsal candidates and research. Link only public sources that can support the case; leave the source link absent when access is not confirmed.

Run `node scripts/validate-story.mjs` after content edits. It checks the seven chapters, four audience lenses, project references, required copy, categories, source URLs and available narration assets. `npm run check` adds behavior checks, type checking, the production build and local-asset verification.

Narration settings and generation provenance belong to the narration manifest and narration documentation. Older research voice presets are deliberately excluded from the case inventory.

The first release passed 16 unit checks and 18 browser checks across 1920×1080, 1440×900 and 390×844, plus story validation, type checking, the production build and offline-asset verification. Voice likeness, pacing and project emphasis remain the focus of the owner's next editorial pass.
