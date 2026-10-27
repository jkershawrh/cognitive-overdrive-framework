# Narration and video production

The portfolio provides an interactive guided presentation and a dedicated cinematic player. Revision 2 renders exact-time browser frames against a fixed speech-aligned timeline, reuses the saved Kersh voice takes, and mixes the original Cognitive Overdrive music. The earlier guided-interface recording remains available as a legacy renderer.

This guide describes the implemented workflow. A render command or successful preflight does not establish that a finished movie has passed review. Use the output checks below before describing an export as verified.

## Inputs

- [`narration/tracks.json`](../narration/tracks.json): chapter IDs, narration text and delivery direction.
- [`narration/voice-profile.json`](../narration/voice-profile.json): the preserved voice profile and provenance.
- [`public/narration/manifest.json`](../public/narration/manifest.json): the text and MP3 URLs consumed by the application.
- `narration/production/<chapter>.json`: input and audio hashes, submitted settings, generation count and review state.
- `narration/production/<chapter>-alignment.json`: ElevenLabs character timestamps for each take.
- [`narration/cinematic-beats.json`](../narration/cinematic-beats.json): exact spoken cues and visual treatments.
- [`narration/cinematic-timeline.json`](../narration/cinematic-timeline.json): resolved voice, visual and caption timing.
- [`narration/film-plan.json`](../narration/film-plan.json): retained interaction plan for the legacy renderer.

Keep all seven chapter IDs aligned with `src/portfolio/story.ts`. The renderer currently expects `01-possibility`, `02-decision`, `03-work`, `04-architecture`, `05-proof`, `06-multiplier` and `07-return`, in that order.

## Preserved Kersh voice

The voice profile records the existing owner-authorized **Kersh** voice, ID `WQ3sRw57ETquvjONdorg`, with model `eleven_v3` and output format `mp3_44100_128`.

The submitted settings are:

```json
{
  "stability": 0.5,
  "similarity_boost": 0.8,
  "style": 0.3,
  "use_speaker_boost": true,
  "speed": 1.04
}
```

The Cognitive Overdrive preset dated 23 October 2026 verifies the voice name, model and stability, and references restoration from the approved Great CPU Bake Off generation. The complete profile comes from that referenced v3 production profile dated 22 October 2026; its SHA-256 is retained in `voice-profile.json`. The older AERIS Multilingual v2 profile is not used.

The first and last tracks use `[warm]`; the middle tracks use `[confident]`. These are delivery directions submitted with the text, not spoken caption text. The generation speed is part of the saved request profile. There is no post-generation speed change or time stretching. Preserving the request settings does not guarantee identical inflection in a new take; likeness and delivery still need a listening review.

## Generate or revise narration

Use Python 3.10 or later. The generator uses the standard library. Start with a dry run from the repository root:

```sh
python3 scripts/generate-narration.py --dry-run
```

The dry run validates existing take hashes and reports pending tracks and character count. It does not read a credential or contact ElevenLabs. Generate missing takes with:

```sh
python3 scripts/generate-narration.py
```

For one chapter:

```sh
python3 scripts/generate-narration.py --track 03-work
```

The generator checks `ELEVENLABS_API_KEY`, then `ELEVEN_API_KEY`. If neither is populated, it requests the existing macOS Keychain item with service `arf-model-gateways` and account `elevenlabs`. Use a trusted secret manager or the machine's existing credential setup to populate these values; the repository contains no API key. The script does not load `.env` files. Alternative Keychain item names can be supplied with `--keychain-service` and `--keychain-account`.

Keychain output is captured in process memory. The key is sent only in the ElevenLabs authentication header; it is not printed or written into the manifest, receipts or source. Native Keychain or execution-environment approval may be required on the host.

Each missing track gets one request to the existing voice's text-to-speech endpoint with timestamps. Requests can consume provider credits. There are no automatic retries after HTTP errors, connection failures or timeouts. If the request outcome is uncertain, inspect the provider's generation history before deliberately submitting another take.

An existing MP3 is reused when its production receipt matches the current input hash. A changed script or profile causes the generator to stop rather than overwrite that take. To make a deliberate revision, archive the prior MP3, receipt and alignment together outside the active input paths, then generate the selected chapter. Keep the old version until the replacement passes review. The manifest is rewritten at the end of a successful generation run.

## Build the cinematic timeline

Revision 2 uses a dedicated cinematic presentation at `/?film=1`. The guided portfolio remains available at `/`. The cinematic player uses one soundtrack clock for its changing scenes. The primary film renderer, `scripts/render-frames.mjs`, explicitly sets each frame time and combines the rendered picture with the existing stereo master. Rendering makes no ElevenLabs request.

The current authored timeline is **330.94 seconds**, with **56 visual beats** and seven chapter voice takes. `narration/cinematic-beats.json` supplies short headlines, visual layouts and exact spoken cues. `scripts/build-cinematic-timeline.mjs` resolves those cues against the stored ElevenLabs character timestamps and writes both `narration/cinematic-timeline.json` and `public/film/timeline.json`, plus caption sidecars.

```sh
npm run build:film
```

The original ten-second opening precedes the first voice at 10.5 seconds. Chapter gaps and the closing hold are explicit timeline values. Changed narration requires rebuilding this timeline and mixing again; do not shift audio independently of the picture.

Three concept renders support the compute, Edge and Launchpad scenes. They remain labeled conceptual artwork. The original Bake Off and Edge excerpts remain recorded demonstrations; AERIS is a rehearsal screenshot. Animated workflows explain responsibilities and the proof scenes reuse the deterministic browser policy. None of these scenes connects to the source systems.

## Mix the soundtrack

The existing Kersh recordings remain the voice sources. The mixer adds the original **Possibility Signal** opening, a speech-ducked underscore and a closing sting, with measured treatment and loudness. See [AUDIO.md](AUDIO.md) for source provenance, dependencies, settings and measured output interpretation.

```sh
npm run mix:audio -- \
  --timeline narration/cinematic-timeline.json \
  --voice-offset 0 \
  --intro-seconds 10 \
  --outro-seconds 4
```

The film master is `output/v2/portfolio-master.wav`; the player uses `public/narration/mixed/portfolio-master.mp3`. The original brand-intro video is muted in this player because the continuous soundtrack already includes the theme. Do not overlay both copies of the opening music.

Mixing does not alter voice timing or regenerate a voice take. WAV and MP3 measurements are not measurements of the eventual AAC encode; subjective listening remains separate.

## Render the cinematic presentation

Install JavaScript dependencies and Playwright Chromium, and provide FFmpeg and FFprobe on `PATH` or through `FFMPEG_BIN` / `FFPROBE_BIN`. The renderer also accepts `--ffmpeg` and `--ffprobe` paths. A supplied binary directory is included in its child-process dynamic-library search path, supporting a bundled macOS encoder without copying libraries into this repository.

```sh
npm ci
npx playwright install chromium
npm run dev -- --host 127.0.0.1
```

In a second terminal, run preflight with the intended release filename:

```sh
npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --output output/v2/cognitive-overdrive-portfolio-v2.mp4 \
  --dry-run
```

Preflight checks the local timeline, required assets, master duration and encoder capabilities. It does not exercise the browser or verify a final film. A short frame render can check startup and timing before the complete run:

```sh
npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --duration 20 \
  --output output/v2/cinematic-smoke.mp4
```

A partial render is marked as a smoke test and is not a publication artifact. Its caption sidecars retain the full timeline, so do not distribute them as a complete short film.

For the full cut, omit `--duration`:

```sh
npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --output output/v2/cognitive-overdrive-portfolio-v2.mp4
```

Only localhost URLs are accepted. Keep the application, timeline, source clips and soundtrack unchanged during rendering. The script opens `/?film=1&frames=1&inspect=1` at 1920 × 1080 and preloads fonts and media.

For each output frame, the renderer dispatches a `cinema:frame` event on `window` containing the exact authored time: `start + frameIndex / 30`. It waits for two animation frames and for visible media seeks to finish, verifies that the application clock matches and all videos are paused and ready, then sends a quality-90 JPEG screenshot directly to FFmpeg. It waits for the encoder to accept each image before preparing the next. Slow rendering increases production time rather than advancing the scene ahead of the picture.

The current full timeline requires **9,929 frames**. The renderer retains requested and observed frame times plus media state in its `.frames.json` sidecar, and checks the encoded frame count. Use `--start` with `--duration` for a selected diagnostic interval; any partial output remains a smoke test with full-timeline captions. These checks establish exact-time frame delivery, not subjective visual quality.

The final encode targets H.264, 30 fps, stereo 48 kHz AAC and fast-start MP4. The existing mixed WAV is preserved without another loudness-normalization pass. Encoded AAC is measured; bounded static attenuation is applied only if required to meet the renderer's true-peak ceiling. The renderer then fully decodes the result and checks resolution, frame rate, encoded frame count, stereo and duration. Actual results belong in the export's verification file, not in a claim inferred from these settings.

## Render three sections and assemble one film

The same fixed timeline can be rendered in three independent sections. Use this partition for the current 330.94-second story: **0–110**, **110–220** and **220–330.94** seconds. At 30 fps these contain **3,300**, **3,300** and **3,329** frames. Intermediate boundaries must land exactly on frame boundaries. Keep the application, timeline, voice master and assets frozen until every section completes.

Run these from the repository root while the same local Vite server is running. They may run sequentially, or in separate terminals if the machine has enough capacity:

```sh
npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --start 0 --duration 110 \
  --output output/v2/segment-1.partial.mp4

npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --start 110 --duration 110 \
  --output output/v2/segment-2.partial.mp4

npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --start 220 --duration 110.94 \
  --output output/v2/segment-3.partial.mp4
```

Each section must finish its own clock, frame-count and decode checks. Its partial status is expected. After all three finish, validate their compatibility without producing the final film:

```sh
node scripts/assemble-film.mjs \
  --segments output/v2/segment-1.partial.mp4,output/v2/segment-2.partial.mp4,output/v2/segment-3.partial.mp4 \
  --output output/v2/cognitive-overdrive-portfolio-v2.mp4 \
  --dry-run
```

Then assemble by running the same command without `--dry-run`. The assembler accepts `--ffmpeg` and `--ffprobe`, or the same environment variables as the frame renderer. It requires ordered, contiguous coverage from zero, matching timeline and master-audio hashes, consistent frame metadata, settled media and compatible H.264 parameters. Missing, repeated, overlapping or mismatched sections are rejected.

The assembler removes each section's audio before joining its video without re-encoding. It encodes **one continuous copy of the full WAV master** for the final soundtrack, avoiding separate AAC segment priming at the joins. The complete output gets fresh AAC measurements, full decode, frame-count, origin and duration checks. Its verification file must pass independently of the partial files.

Assembly writes the same final MP4, caption, timeline, frame and verification sidecars. Intermediate files use `.assembly-work/`; selected section stills are collected in `.stills/`. The source section files remain available. If the story duration changes, compute a new contiguous frame-aligned partition instead of reusing these times.

## Captions and outputs

Caption timing comes from the stored provider character timestamps plus the fixed chapter schedule. The builder removes delivery tags and checks text alignment. Captions are sidecar SRT and WebVTT files; they are not burned into the image or embedded as an MP4 subtitle stream. The player exposes a CC toggle.

With the full command above, the intended deliverables are:

- `output/v2/cognitive-overdrive-portfolio-v2.mp4`
- Matching `.srt` and `.vtt` caption sidecars.
- Matching `.timeline.json`, `.verification.json` and `.frames.json` diagnostics.
- A matching `.frames-work/` directory for a single render, or `.assembly-work/` plus `.stills/` for assembled sections.

The `output/` directory is ignored by Git. Raw production diagnostics can contain absolute host paths from encoder probes; prepare a sanitized report before attaching diagnostics to a public release. The intended release tag is `v0.2.0`. A metadata field describing technical eligibility is not evidence of subjective listening, visual approval or successful publication.

Before reporting a finished revision, inspect the resulting opening, logo crop, speech-to-scene changes, recorded-media labels, hardware evidence states, three proof outcomes, Launchpad sequence and final closing hold. Listen through the encoded film with headphones and ordinary speakers. Verify caption alignment in the delivered player. [REVISION-2-AUDIT.md](REVISION-2-AUDIT.md) tracks this revision's remaining checks.

## Diagnostic and earlier renderers

`scripts/render-cinematic.mjs` remains a real-time capture diagnostic. Its frame-clock checks detected lag in a full capture, so that capture was not published. It is not the primary release renderer.

`scripts/render-video.mjs` remains available through `npm run render:legacy`. It operates the guided interface using `narration/film-plan.json`, rather than the cinematic beat timeline, and does not add the revision-2 music bed. Its earlier export and verification history belong to v0.1.0; they do not certify the new cinematic pipeline.

See [the evidence guide](EVIDENCE.md) for implementation, historical evidence, rehearsal and candidate boundaries, and [the brand guide](BRAND.md) for the exact original identity.

## Frame and clip fidelity

`npm run render:video` uses the exact-time renderer. `npm run assemble:video` joins verified sections, and `npm run verify:film-media -- --ffprobe /path/to/ffprobe` checks the retained frame ledgers. The media verifier derives its clip tolerance from each source’s measured frame rate; it reports authored scene-clock rounding separately from embedded-video sampling. The two project excerpts are 25 fps, so their fidelity bound is one 40 ms source frame, not a claim of subframe video accuracy.

Video ends are quantized to a whole frame; audio is trimmed independently. For this timeline, preserve all 9,929 frames (330.966667 seconds) and the 330.940-second soundtrack. Applying one output-level `-t 330.94` can drop the final frame. Both rendering and assembly were checked with fractional-duration regression samples. `scripts/recover-final-frame.mjs` records the narrowly scoped recovery used for the first revision-2 export: it rerendered the single missing terminal frame at its authored time, preserved the existing encoded prefix, and required full decoding and timestamp checks before accepting the repaired section. Normal future exports use the corrected duration handling.
