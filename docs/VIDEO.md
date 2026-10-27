# Narration and video production

The portfolio has two delivery modes: interactive chapter narration and a narrated recording of the actual local presentation. The video workflow reuses the saved voice takes, operates the visible controls, and exports captions from the provider's character timestamps. Rendering does not make a new ElevenLabs request.

This guide describes the implemented workflow. A render command or successful preflight does not establish that a finished movie has passed review. Use the output checks below before describing an export as verified.

## Inputs

- [`narration/tracks.json`](../narration/tracks.json): chapter IDs, narration text and delivery direction.
- [`narration/voice-profile.json`](../narration/voice-profile.json): the preserved voice profile and provenance.
- [`public/narration/manifest.json`](../public/narration/manifest.json): the text and MP3 URLs consumed by the application.
- `narration/production/<chapter>.json`: input and audio hashes, submitted settings, generation count and review state.
- `narration/production/<chapter>-alignment.json`: ElevenLabs character timestamps for each take.
- [`narration/film-plan.json`](../narration/film-plan.json): the interactions shown during each chapter.

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

## Render the real presentation

Use the repository's supported Node.js version, install its dependencies, and ensure Playwright Chromium is available:

```sh
npm ci
npx playwright install chromium
```

The render process also needs `ffmpeg` and `ffprobe`. Both can be on `PATH`, supplied with `--ffmpeg` and `--ffprobe`, or selected through environment variables:

```sh
export FFMPEG_BIN=/path/to/ffmpeg
export FFPROBE_BIN=/path/to/ffprobe
```

When a binary path contains a directory, the renderer includes that directory in the child process's dynamic-library search path. This supports the existing macOS bundled encoder without copying its libraries into the repository.

Start the presentation in one terminal:

```sh
npm run dev -- --host 127.0.0.1
```

In a second terminal, verify the inputs:

```sh
npm run render:video -- --url http://127.0.0.1:5177 --dry-run
```

This checks the narration files, audio durations, alignment text, chapter sequence, spoken cue locations and required FFmpeg filters. It does not exercise the browser controls or produce a film. Use the actual local port printed by Vite if it differs from 5177.

Then record:

```sh
npm run render:video -- --url http://127.0.0.1:5177
```

Only localhost URLs are accepted. Keep the running app and its assets unchanged during capture. Recording takes approximately the length of the narration plus chapter holds, followed by encoding time. A distinct output name preserves a previous cut:

```sh
npm run render:video -- \
  --url http://127.0.0.1:5177 \
  --output output/portfolio-r2.mp4
```

The renderer uses a 1920 × 1080 browser viewport and real Playwright control clicks. It selects the audience lenses, opens source-backed case views, reveals the architecture, changes simulation conditions and opens Launchpad's case. It retains the app's source-status and simulation labels. Those interactions demonstrate the portfolio UI; they do not execute its underlying case-study infrastructure.

A short black calibration pre-roll establishes the capture's video origin and is trimmed from the delivered film. Narration tracks are placed against the recorded chapter timestamps. The final encoding uses H.264, 30 fps output, AAC audio and fast-start MP4 packaging. Voice level normalization targets −16 LUFS and a −1.5 dB true-peak ceiling; the export's measured loudness must be checked separately. No music bed or playback-speed change is added by this renderer.

## Timing and captions

Film-plan actions can use a `cue` that appears in the narration, with an optional offset in seconds, or a `fraction` of the track's duration for visual pacing. Phrase cues use the stored ElevenLabs alignment. Changing narration wording also requires reviewing its corresponding cues.

The renderer removes delivery tags, checks that aligned text matches the manifest, and groups timed words into readable captions. SRT and WebVTT timings come from the provider's character timestamps plus the recorded chapter start. They are not estimated from sentence length. The app's **CC** button is a chapter transcript; the exported caption files provide timed cues for the film.

Captions are delivered as sidecar files. They are not burned into the picture or embedded as an MP4 subtitle stream. Use the `.srt` file with a compatible video player, or the `.vtt` file in a web player's `<track>` element.

## Outputs and review

A successful run writes:

- `output/cognitive-overdrive-portfolio.mp4`: the narrated film.
- `output/cognitive-overdrive-portfolio.srt` and `.vtt`: aligned caption sidecars.
- `output/cognitive-overdrive-portfolio.timeline.json`: chapter times, intended and observed interaction times, and calibration trim.
- `output/cognitive-overdrive-portfolio.verification.json`: reported codecs, dimensions, duration, subtitle count and browser-error state.
- `output/stills/`: one representative frame per chapter.
- `output/video-work/`: the browser recording and intermediate schedule.

The filenames follow `--output` for the final film and its sidecars. Intermediate captures and stills remain in their standard directories. The `output/` directory is ignored by Git.

Before sharing an export, decode the full movie, inspect representative frames and transitions, verify the last spoken sentence and closing hold, and play the film with its captions. For an encoder on `PATH`, a full decode check is:

```sh
ffmpeg -v error -i output/cognitive-overdrive-portfolio.mp4 -f null -
```

Also inspect the actual hardware evidence panel, Bake Off and Edge excerpts, AERIS concept label, three simulation outcomes and Launchpad handoff in the resulting film. The renderer's metadata file and absence of browser exceptions do not substitute for those visual checks or a subjective listening review. Generation receipts deliberately keep voice-likeness review marked pending until that review occurs.

See [the evidence guide](EVIDENCE.md) for the meaning of source implementation, historical evidence, rehearsal and candidate status.
