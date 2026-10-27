# Existing Cognitive Overdrive identity

The portfolio reuses the owner's original website identity and revision-2 brand introduction. The copied assets are byte-for-byte originals. [Brand provenance](../data/brand-provenance.json) records source identities, SHA-256 hashes, dimensions and the original crop contracts without workstation paths.

## Logo and wordmark

`public/brand/approved-main-reference.png` is the original 1536 × 1024 reference. The source film displays the cream CO mark and cream-to-orange/pink wordmark using an overflow-hidden crop of this image. It does not redraw either mark.

- CO mark: x 53, y 17, width 65, height 38.
- Wordmark: x 47, y 126, width 638, height 209.

For a rendered crop width `W`, use scale `W / cropWidth`. The outer rectangle has width `W` and height `cropHeight × scale`; place the full image at width `1536 × scale`, height `1024 × scale`, left `−x × scale` and top `−y × scale`. The original uses `mix-blend-mode: screen` against near-black. Preserve the whole reference image and its aspect ratio.

The source palette is ink `#070909`, paper `#eee9dd`, lime `#d7f44c`, pink `#ff349d` and cyan `#58c9ed`. Original Anton and DM Sans webfonts and their license files are included under `public/brand/fonts/`. Conscience is a distinct brand branch and is not the main portfolio logo.

## Original opening

`public/brand/cognitive-overdrive-intro-v2.mp4` is the original revision-2 ten-second opening: 1920 × 1080, 30 fps, H.264 video and stereo 48 kHz AAC. The container reports 10.005 seconds because of audio padding. The logo reveal occurs at 7.5 seconds. The poster is `public/brand/cognitive-overdrive-intro-poster.png`.

The clip already contains the original **Possibility Signal** theme. Do not mix a duplicate copy of the intro music over it. A separate music implementation owns the continuous quieter bed beneath the portfolio narration.

The original theme uses synthesized oscillators and generated percussion at 128 BPM, with stereo delay and reverb. Its source metadata declares no third-party samples or copied melody. Original source files retain draft status and historical review fields; copying them does not rewrite that history or establish a new review outcome.

## Motion and rendering

The introduction's rotating sculpture is frame-driven SVG geometry projected from three dimensions. The original website's dense rainbow sculpture and studio scene are raster imagery. No standalone GLB, GLTF, OBJ or Blender model was present in the inspected source package. A raster image with camera motion should not be described as an interactive physical simulation.

The source revision-2 renderer corrected intermittent tiled-frame artifacts using pinned Chrome Headless Shell, ANGLE, PNG capture and disabled shared-memory capture. This is useful precedent for the portfolio export, not evidence that a new render is glitch-free. Verify the new export independently.

Only branding assets, the brand intro and font licenses were copied. Personal narration recordings, credentials, the original review application and publishing controls were not imported by this branding change.
