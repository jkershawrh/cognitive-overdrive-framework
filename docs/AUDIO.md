# Cinematic audio mix

`scripts/mix-audio.py` combines the existing Kersh voice takes with the original Cognitive Overdrive music. It does not call ElevenLabs, change speech timing or pitch, or add voice reverb. The separate [voice and video runbook](VIDEO.md) covers generating a deliberate new take and the exact-time video export.

## Run

Use Python with NumPy and SciPy, plus FFmpeg and FFprobe. The mixer works locally and needs no credential. From the repository root:

```sh
python3 scripts/mix-audio.py \
  --timeline narration/cinematic-timeline.json \
  --voice-offset 0 \
  --intro-seconds 10 \
  --outro-seconds 4 \
  --ffmpeg /path/to/ffmpeg \
  --ffprobe /path/to/ffprobe
```

The binaries can instead be on `PATH` or selected with `FFMPEG_BIN` and `FFPROBE_BIN`. Add `--dry-run` to check required source files and timeline placement without mixing. `--skip-chapters` produces the continuous film master without rebuilding the chapter previews.

The cinematic timeline's schedule contains `id`, `src`, `text`, `start`, `duration` and `chapter` for each voice track, plus the overall `total`. Its timestamps already include the ten-second visual intro, with the first voice starting at 10.5 seconds. Keep `--voice-offset 0` for this timeline. Use a nonzero offset only when deliberately shifting an older schedule to match a newly prepended visual intro. The outro occupies the existing closing hold; the mixer does not silently extend the timeline.

Run again after changing the voice inputs, timeline or mix profile. Existing mixed outputs are replaced; the original voice recordings and music sources remain separate.

## Preserved music

[`public/music/provenance.json`](../public/music/provenance.json) retains the original music record and hashes for the copied theme, underscore and sting. The composition is **Possibility Signal v0.2.0**: a ten-second, 128 BPM original synthesized theme, with its main logo hit at 7.5 seconds. The source reports no third-party recorded samples or copied melody. Its historical release-state field remains part of that original record; the new usage entry records reuse for this portfolio revision.

The full theme plays during the branded opening. A loop of the original underscore continues beneath narration, with overlapping fades at its musical loop boundaries. Speech-responsive ducking lowers the bed before spoken onsets and releases it gradually between phrases. The original sting occupies the closing hold. All music remains stereo; narration is centered.

## Voice treatment

[`narration/mix-profile.json`](../narration/mix-profile.json) is the reusable configuration. The default EQ uses a 65 Hz high-pass, a restrained body shelf at 110 Hz, a 1.8 dB cut around 240 Hz, a 1.3 dB presence lift around 3.2 kHz and a 0.5 dB air shelf at 8.5 kHz. These settings are intended to keep the voice natural while reducing low-mid congestion.

Compression and de-essing have measured activation gates. The compressor checks the voiced level range and crest factor before applying a 1.6:1 ratio with a maximum three-decibel reduction. The de-esser checks the fraction of active spectral frames with elevated high-band energy before applying up to two decibels of band reduction. The metrics report whether each stage activated and the reduction actually applied. The gates are engineering heuristics; they do not replace listening to the result.

Per-track static level adjustment aims for −17 LUFS while retaining peak headroom. The final mix uses measured two-pass loudness normalization targeting −16 LUFS and −1.5 dBTP. The metrics report measurements of the saved WAV and encoded MP3, rather than treating requested targets as achieved results.

## Outputs

A successful run writes:

- `output/v2/portfolio-master.wav`: the stereo 48 kHz film master.
- `output/v2/portfolio-master.metrics.json`: input hashes, DSP decisions, raw and processed voice levels, gain reduction, ducking measurements and final measured loudness.
- `output/v2/audio-work/`: decoded takes, processed voices, separate voice/music stems and intermediate masters.
- `public/narration/mixed/portfolio-master.mp3`: the continuous soundtrack for a player whose visual timeline follows `audio.currentTime`.
- `public/narration/mixed/<chapter>.mp3`: chapter mixes with the same voice timing as their original takes, without a repeated ten-second intro.
- `public/narration/mixed/manifest.json`: chapter mix URLs and their original voice source references.

The music-under-voice report contains measured RMS differences for ten-millisecond voiced windows, including the tenth percentile, median and ninetieth percentile. This describes how the stems relate during speech. It is not a claim about subjective clarity or a subtraction of integrated loudness readings.

Review the finished soundtrack with headphones and ordinary speakers. Check the opening hit, the first spoken syllable, music audibility under quiet phrases, sibilance, chapter transitions and complete closing sentence. The generated metrics keep subjective listening review marked pending until that review occurs. After muxing or re-encoding the film, verify the final container's audio again; the WAV's peak measurement does not automatically certify a later encode.
