# Revision 2 production audit

Release: **v0.2.0**. Film: `cognitive-overdrive-portfolio-v2.mp4`, 330.967 seconds, 1920 × 1080 at 30 fps. The [verification record](../data/revision-2-verification.json) binds the measurements to the final file SHA-256. [Release assets](https://github.com/jkershawrh/cognitive-overdrive-framework/releases/tag/v0.2.0) include the MP4 and caption sidecars.

## What changed

The revision responds to the owner's review of the first cut: incorrect branding, absent opening music and music bed, too much on-screen text, visual glitches and insufficient motion.

- **Original identity restored.** The CO mark and multicolor wordmark use the source image's exact crop geometry. The original revision-2 ten-second brand intro and poster are retained. Source hashes, font licenses and crop contracts are recorded in [brand provenance](../data/brand-provenance.json).
- **Music restored.** The original Possibility Signal theme opens the experience, its quieter underscore continues beneath narration, and a sting supports the closing hold. The existing voice takes remain separate from the music sources. The mixer measures its saved WAV and MP3 outputs; [AUDIO.md](AUDIO.md) explains treatment and measurement limits.
- **Speech directs the picture.** A dedicated cinematic player uses 56 visual beats resolved from exact spoken phrases. The current authored schedule is 330.94 seconds, including the opening and closing holds. Short headlines replace full paragraphs in this treatment; the guided portfolio retains detailed exploration.
- **More visual explanation.** Project excerpts, moving projected geometry, progressive request flows, authority gates, a delivery sequence and three labeled concept renders carry the story. These are authored illustrations and recorded experiences, not newly measured source-system executions.
- **Frames use exact authored times.** The primary `scripts/render-frames.mjs` renderer requests each time through `window`’s `cinema:frame` event, waits two animation frames and media seek completion, verifies clock and paused-media state, and pipes quality-90 JPEG frames into FFmpeg. The current full timeline requires 9,929 frames at 30 fps. Final checks cover encoded frame count, AAC loudness, full decode and media properties.
- **Verified sections share one soundtrack.** The current render is partitioned at 0, 110 and 220 seconds into 3,300, 3,300 and 3,329 frames. `scripts/assemble-film.mjs` checks contiguous coverage, frame clocks, compatible video and matching timeline/audio hashes, then joins the video and encodes the complete WAV master once. The assembled result receives its own media and audio checks.
- **Player controls were corrected.** Seeking and soundtrack-error handling have been updated and their browser checks pass.
- **Evidence boundaries remain visible.** Intel reference work, recorded AMD runs, historical NVIDIA fleet evidence and Arm portability remain separate states. AERIS is a rehearsal concept. The proof sequence uses the same deterministic browser policy as the guided experience. Launchpad's documented workflow is shown without claiming current pilot health or measured organizational impact.

## Checks completed independently of the new film

The copied original brand intro matches its source review-manifest SHA-256 and passed a full audio/video decode. Its source is 1920 × 1080 at 30 fps; the nominal ten-second composition has a 10.005-second container because of audio padding. The original reference, source introduction frames and source poster were visually inspected.

The existing Edge and Bake Off excerpts were extracted from actual project films. Edge's canonical film is 540 seconds; Bake Off's selected business-story film is 300 seconds. AERIS's movie was unavailable as actual local bytes, so the portfolio retains its authentic existing screenshot. No new footage is implied by that screenshot.

The current authored timeline, source code and documentation were inspected for the changes described above. Any earlier unit/browser result belongs to the version on which it ran. The actual integrated brand was subsequently inspected in the browser and rendered stills, covering the CO mark and original wordmark crop. This supersedes the earlier isolated screenshot check that could not launch; inspection of the final assembled movie remains separate.

The real-time capture diagnostic detected lag in a full run; that failed capture was not published. The release path now renders exact-time frames, so production speed does not advance the authored scene clock.

## Public-source disclosure review

A value-suppressed pattern scan of 141 tracked and nonignored repository files, approximately 52.1 MB, found no workstation absolute paths, private-key material, common provider-token forms, credential-bearing URLs, hardcoded credential assignments or internal-cluster URLs in that source snapshot. This is a bounded disclosure check, not a comprehensive security certification. Ignored render outputs, Git history, dependencies and remote services were outside its scope.

The source keeps `.env` files, build/dependency output and `output/` render artifacts ignored. Raw FFprobe metadata in ignored verification files can include an absolute encoder filename. Before publishing diagnostic reports, remove workstation paths from `media.format.filename` and other output-path fields. Keep hashes, codecs, dimensions, frame counts, timing and audio measurements in the public report.

## Completed artifact checks and review limits

- **Application:** current `npm run check` passes story validation, all 16 unit tests, TypeScript, production build and offline assets. Guided browser coverage passed 18 checks across desktop, laptop and phone. Cinematic coverage passed 12 unique executed checks across desktop and phone runs, including all 56 desktop headline bounds, recorded-clip seeking, soundtrack failure behavior, proof states, playback and captions.
- **Complete frame delivery:** all 9,929 frames are present. The maximum recorded authored scene-clock rounding is 0.333333 ms. Sections join at 110 and 220 seconds with exactly one frame interval between adjacent samples.
- **Embedded footage:** the 25 fps Bake Off and Edge sources stay within one source-frame interval (40 ms), with maximum observed timestamp difference 33.334 ms and no accumulating drift under the recorded checks. This is separate from the authored scene clock and does not claim subframe source-video accuracy.
- **Final media:** H.264, 1920 × 1080, 30 fps, 9,929 frames, stereo 48 kHz AAC. Both streams start at zero. Video lasts 330.966667 seconds; audio lasts 330.940000 seconds. The video tail is one whole-frame quantization of the authored endpoint. Full audio/video decoding passes.
- **Final encoded audio:** -16.04 LUFS integrated, -1.38 dBTP true peak and 3.0 LU loudness range; 0.00 dB additional attenuation. This measurement is from the delivered AAC, not inferred from the WAV or MP3.
- **Image inspection:** 58 encoded samples cover all 56 visual beats plus opening and closing. The assembled-film samples match the reviewed section images exactly. The restored terminal frame was separately inspected. This checks the original brand, text fit, project excerpts, diagrams, proof states and concept renders; it is not a claim of continuous subjective playback review.
- **Captions:** 76 ordered cues remain within the film bounds, from 10.713 to 326.980 seconds. SRT and WebVTT are aligned sidecars. Browser caption behavior passes; no external-player compatibility claim is made.
- **Listening limit:** a complete subjective listen has not been performed. EQ, dynamics, sibilance control, timing and music ducking have measured checks; those checks do not establish a listener's preference for voice or music balance.

The initial real-time capture failed its timing gate and was not delivered. Exact-time rendering removed that production-speed dependency. A separate final-duration check caught one truncated terminal frame; it was rerendered at 330.933333333 seconds and appended without re-encoding the preceding frames. Future renders and assembly trim audio independently from the video frame count. Fractional-end regression samples pass for both paths.

The owner authorized the public repository and release. No new publication approval is required.

## Edge footage findings for later edits

Source identity: Edge Inference at Scale, `demo/public/film/edge-field-story.mp4`, 540 seconds, 1440 × 900, 25 fps. Keep its conceptual-hardware and rehearsal labels when using footage. The chapter model and inspected original frames support these candidate intervals:

- **120–146 seconds:** assembled field node reveal; 120–135 seconds is a compact device-introduction passage.
- **181–193 seconds:** current bundled software-flow excerpt. It explains the message pipeline and is not physical-hardware footage.
- **347–397 seconds:** hardware chapter. **361–382 seconds** spans CPU compute and local storage in the exploded stack; an inspected frame at 365 seconds confirms this composition. This is the strongest candidate for a longer mechanical view.
- **382–397 seconds:** connectivity and power layers complete the exploded hardware explanation.
- **452–480 seconds:** conceptual fleet/village view, useful for the organizational-scale transition. It does not demonstrate measured coverage or capacity.

These additional intervals are candidates, not newly copied clips. The physical component layout and dimensions are conceptual; field operation, board support, power and throughput require separate qualification.

For Cognitive Overdrive's original intro, the complete opening is **0–10 seconds** and the wordmark lands at **7.5 seconds**. Use the complete music build when preserving that original treatment.
