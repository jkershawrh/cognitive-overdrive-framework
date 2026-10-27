#!/usr/bin/env node
/** Capture the cinematic app against its fixed audio timeline. No voice generation. */
import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { inflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const arg = (name, fallback) => { const i = process.argv.indexOf(name); if (i < 0) return fallback; if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(`Missing value for ${name}`); return process.argv[i + 1] }
const base = arg('--url', 'http://127.0.0.1:5177').replace(/\/$/, '')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw Error('Capture requires a local preview URL.')
const ffmpeg = arg('--ffmpeg', process.env.FFMPEG_BIN ?? 'ffmpeg')
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe')
const timelinePath = resolve('narration/cinematic-timeline.json')
const timelineSource = await readFile(timelinePath, 'utf8')
const timeline = JSON.parse(timelineSource)
const duration = Number(arg('--duration', timeline.total))
if (!Number.isFinite(duration) || duration < 1 || duration > timeline.total + .001) throw Error('Duration must be between one second and the fixed timeline duration.')
const partial = duration < timeline.total - .001
let output = resolve(arg('--output', 'output/v2/cognitive-overdrive-cinematic.mp4'))
if (!output.endsWith('.mp4')) throw Error('Output must use an .mp4 extension.')
if (partial && !/smoke|partial/i.test(basename(output))) output = output.replace(/\.mp4$/, `.smoke-${duration}s.mp4`)
const sidecar = suffix => output.replace(/\.mp4$/, suffix)
const work = sidecar('.work')
const audio = resolve('output/v2/portfolio-master.wav')
const binaryEnv = bin => bin.includes('/') ? { ...process.env, DYLD_LIBRARY_PATH: [dirname(resolve(bin)), process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':') } : process.env
function run(bin, args, binary = false) {
  const result = spawnSync(bin, args, { encoding: binary ? undefined : 'utf8', maxBuffer: 20 * 1024 * 1024, env: binaryEnv(bin) })
  if (result.error || result.status !== 0) throw Error(String(result.error?.message ?? result.stderr ?? 'Command failed').slice(-4000))
  return result
}
function runAsync(bin, args) {
  return new Promise((accept, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: binaryEnv(bin) })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-100000) })
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-100000) })
    child.once('error', reject)
    child.once('close', code => code === 0 ? accept({ stdout, stderr }) : reject(Error(stderr || `Command exited ${code}`)))
  })
}
const probe = path => JSON.parse(run(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path]).stdout)
const ratio = text => { const [a, b = 1] = text.split('/').map(Number); return a / b }
const hash = value => createHash('sha256').update(value).digest('hex')

// Decode small grayscale PNGs without optional FFmpeg filters or image packages.
function calibrationFrames(buffer) {
  const frames = []; let offset = 0
  while (offset < buffer.length) {
    if (!buffer.subarray(offset, offset + 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw Error('Invalid PNG calibration stream.')
    offset += 8; let width = 0; let height = 0; const compressed = []
    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset); const type = buffer.toString('ascii', offset + 4, offset + 8)
      const data = buffer.subarray(offset + 8, offset + 8 + length); offset += length + 12
      if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 0 || data[12] !== 0) throw Error('Calibration requires noninterlaced grayscale PNG.') }
      if (type === 'IDAT') compressed.push(data)
      if (type === 'IEND') break
    }
    const filtered = inflateSync(Buffer.concat(compressed)); const pixels = Buffer.alloc(width * height)
    for (let y = 0; y < height; y++) {
      const filter = filtered[y * (width + 1)]
      for (let x = 0; x < width; x++) {
        const index = y * width + x; const left = x ? pixels[index - 1] : 0; const above = y ? pixels[index - width] : 0; const corner = x && y ? pixels[index - width - 1] : 0
        const prediction = left + above - corner; const pa = Math.abs(prediction - left); const pb = Math.abs(prediction - above); const pc = Math.abs(prediction - corner)
        const correction = [0, left, above, Math.floor((left + above) / 2), pa <= pb && pa <= pc ? left : pb <= pc ? above : corner][filter]
        if (correction === undefined) throw Error('Unsupported PNG filter.')
        pixels[index] = (filtered[y * (width + 1) + x + 1] + correction) & 255
      }
    }
    frames.push(pixels)
  }
  return frames
}

await Promise.all([audio, 'public/film/timeline.json', 'public/film/captions.srt', 'public/film/captions.vtt', 'public/brand/cognitive-overdrive-intro-v2.mp4'].map(path => access(path)))
if (JSON.stringify(JSON.parse(await readFile('public/film/timeline.json', 'utf8'))) !== JSON.stringify(timeline)) throw Error('Public film timeline differs from the narration timeline. Rebuild the timeline before rendering.')
const audioProbe = probe(audio)
if (Math.abs(Number(audioProbe.format.duration) - timeline.total) > .02) throw Error('Mixed WAV duration differs from the fixed timeline.')
const filters = run(ffmpeg, ['-hide_banner', '-filters']).stdout
const hasFilter = name => new RegExp(`\\b${name}\\b`).test(filters)
for (const filter of ['scale', 'crop', 'loudnorm', 'volume']) if (!hasFilter(filter)) throw Error(`Missing FFmpeg filter: ${filter}`)
if (!hasFilter('pad') && !hasFilter('rotate')) throw Error('Barcode masking requires the pad or rotate filter.')
// Angle zero supplies an exact pad fallback in minimal FFmpeg builds. The second
// crop removes its four top fill rows, retaining all original top 1076 pixels.
const barcodeMask = hasFilter('pad') ? 'crop=1920:1076:0:0,pad=1920:1080:0:0:color=0x070909' : 'crop=1920:1076:0:0,rotate=0:ow=1920:oh=1084:c=0x070909,crop=1920:1080:0:4'
const readiness = { ready: true, mode: partial ? 'SMOKE TEST — PARTIAL, NOT FOR PUBLICATION' : 'full film', output, duration, timelineDuration: timeline.total, timelineSha256: hash(timelineSource), audio: 'output/v2/portfolio-master.wav', capture: 'real browser; native recording frame rate measured after capture', delivery: '1920x1080 at 30 fps', barcodeMask, timingThresholds: { percentile95LagSeconds: .25, maximumLagSeconds: .5, excludedFirstSeconds: .2, maximumClockRegressionSeconds: 1 / 30, maximumClockRegressionFraction: .005 }, audioProcessing: 'Preserve mixed WAV; AAC encoding, static attenuation only if encoded true peak exceeds -1 dBTP' }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify(readiness, null, 2)); process.exit(0) }
await mkdir(work, { recursive: true }); await mkdir(resolve(work, 'stills'), { recursive: true }); await mkdir(dirname(output), { recursive: true })
await writeFile(sidecar('.timeline.json'), timelineSource)
const errors = []; const warnings = []; const clockSamples = []; const stills = []
const metadata = { ...readiness, ready: false, publicationEligible: false, browserErrors: errors, browserWarnings: warnings, clockSamples, stills, startedAt: new Date().toISOString() }
const saveMetadata = () => writeFile(sidecar('.verification.json'), JSON.stringify(metadata, null, 2))
await saveMetadata()

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] })
let context; let video; let start; let prerollSeconds = 0
try {
  context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: work, size: { width: 1920, height: 1080 } }, reducedMotion: 'no-preference', colorScheme: 'dark' })
  const page = await context.newPage(); page.setDefaultTimeout(30000); video = page.video()
  const created = performance.now()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); else if (message.type() === 'warning') warnings.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`) })
  await page.goto(`${base}/?film=1&capture=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('.cinema').waitFor(); await page.locator('[data-start="true"]').waitFor(); await page.locator('.capture-clock').waitFor()
  const clockBounds = await page.locator('.capture-clock').boundingBox()
  if (!clockBounds || clockBounds.x !== 0 || clockBounds.y !== 1076 || clockBounds.width !== 128 || clockBounds.height !== 4) throw Error('Capture clock must occupy the bottom-left 128 by 4 pixels.')
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load('16px "DM Sans"'), document.fonts.load('120px Anton'), document.fonts.ready])
    const imagePaths = ['/renders/compute.png', '/renders/edge.png', '/renders/launchpad.png', '/images/project-bakeoff.png', '/images/project-edge.png', '/images/project-aeris.png', '/brand/cognitive-overdrive-intro-poster.png', '/logos/redhat.svg']
    await Promise.all(imagePaths.map(src => new Promise((accept, reject) => { const img = new Image(); img.onload = () => accept(null); img.onerror = () => reject(Error(`Image preload failed: ${src}`)); img.src = src })))
    const videos = [...document.querySelectorAll('video')]
    for (const src of ['/showcase/bakeoff.mp4', '/showcase/edge.mp4']) { const v = document.createElement('video'); v.src = src; v.preload = 'auto'; v.muted = true; videos.push(v) }
    await Promise.all(videos.map(v => new Promise((accept, reject) => {
      if (v.readyState >= 3) return accept(null)
      const timeout = setTimeout(() => reject(Error(`Video preload timed out: ${v.src}`)), 20000)
      v.addEventListener('canplay', () => { clearTimeout(timeout); accept(null) }, { once: true })
      v.addEventListener('error', () => { clearTimeout(timeout); reject(Error(`Video preload failed: ${v.src}`)) }, { once: true }); v.load()
    })))
    const cover = document.createElement('div'); cover.id = 'cinema-calibration'
    cover.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:2147483647;pointer-events:none;'
    document.body.append(cover)
    const style = document.createElement('style'); style.textContent = '*{cursor:none!important}'; document.head.append(style)
  })
  await page.waitForTimeout(700)
  // Remove calibration and start the app clock within the same browser task.
  const browserOrigin = await page.evaluate(() => { document.getElementById('cinema-calibration').remove(); document.querySelector('[data-start="true"]').click(); return performance.now() })
  start = performance.now(); prerollSeconds = (start - created) / 1000
  metadata.browserOrigin = browserOrigin
  console.log(`Recording ${partial ? 'partial smoke' : 'full cinematic film'}: ${duration.toFixed(2)} seconds.`)
  // No screenshots while recording: they can block compositor delivery.
  // Separate inspect-mode stills may be captured after the recording finishes.
  let nextLog = 0; let current = 0
  while (current < duration - .06) {
    const state = await page.locator('.cinema').evaluate(el => ({ time: Number(el.dataset.time), running: el.dataset.running === 'true', finished: el.dataset.finished === 'true' }))
    current = state.time
    const elapsed = (performance.now() - start) / 1000
    if (!Number.isFinite(current) || elapsed > duration + 8 || elapsed - current > 3) throw Error('Cinematic app clock stalled or diverged from real time.')
    if (!state.running && current < duration - .05) throw Error('Cinematic playback stopped before the requested endpoint.')
    if (current >= nextLog) { clockSamples.push({ appTime: current, hostElapsed: elapsed, driftSeconds: elapsed - current }); console.log(`Capture ${current.toFixed(1)} / ${duration.toFixed(1)} seconds`); nextLog += 20 }
    if (current < duration - .06) await page.waitForTimeout(Math.min(100, Math.max(10, (duration - current) * 1000)))
  }
  metadata.captureEnd = { appTime: current, hostElapsed: (performance.now() - start) / 1000 }
  await page.waitForTimeout(200) // Preserve the final composited frame; export trims to the fixed duration.
} catch (error) {
  metadata.failure = error.message; throw error
} finally {
  if (context) await context.close(); await browser.close(); await saveMetadata()
}
if (errors.length) throw Error('Browser errors during recording: ' + errors.join('; '))
const raw = await video.path(); const rawProbe = probe(raw)
const captureFps = ratio(rawProbe.streams.find(stream => stream.codec_type === 'video').r_frame_rate)
if (!Number.isFinite(captureFps) || captureFps < 20 || captureFps > 60) throw Error('Unexpected browser recording frame rate.')
const calibration = run(ffmpeg, ['-v', 'error', '-i', raw, '-t', String(prerollSeconds + 2), '-vf', 'scale=16:9', '-an', '-pix_fmt', 'gray', '-fps_mode', 'passthrough', '-c:v', 'png', '-f', 'image2pipe', '-'], true)
const whiteRuns = []; let consecutiveWhite = 0
for (const [i, pixels] of calibrationFrames(calibration.stdout).entries()) {
  if (pixels.every(value => value > 248)) consecutiveWhite++
  else { if (consecutiveWhite >= Math.floor(captureFps * .48)) whiteRuns.push({ start: (i - consecutiveWhite) / captureFps, end: i / captureFps, frames: consecutiveWhite }); consecutiveWhite = 0 }
}
// Initial browser navigation can briefly be white; the intentional marker is the final sustained white run.
const marker = whiteRuns.at(-1)
if (!marker || marker.frames / captureFps > 1.2 || Math.abs(marker.end - prerollSeconds) > 1.5) throw Error('White calibration marker could not be validated.')
const trimStart = marker.end
if (Number(rawProbe.format.duration) - trimStart < duration - .1) throw Error('Browser video is shorter than the fixed timeline after calibration.')
Object.assign(metadata, { rawRecording: basename(raw), nativeCaptureFps: captureFps, outputFps: 30, calibration: { whiteRuns, trimStart, frameResolutionSeconds: 1 / captureFps }, audioSourceSha256: hash(await readFile(audio)), captionSource: 'ElevenLabs character alignments in the fixed cinematic timeline' })
await saveMetadata()
console.log('Checking visual timing from the captured 16-bit frame clock.')
const clockDecode = run(ffmpeg, ['-v', 'error', '-i', raw, '-t', String(trimStart + duration + .1), '-vf', 'crop=128:4:0:1076,scale=16:1', '-an', '-pix_fmt', 'gray', '-fps_mode', 'passthrough', '-c:v', 'png', '-f', 'image2pipe', '-'], true)
const visualFrames = []; let eligibleFrames = 0; let invalidFrames = 0; let nonmonotonicFrames = 0; let priorClock = -1; let maximumClockRegressionSeconds = 0
for (const [index, pixels] of calibrationFrames(clockDecode.stdout).entries()) {
  const videoTime = index / captureFps - trimStart
  if (videoTime < .2 || videoTime > duration) continue
  eligibleFrames++
  const clockFrame = pixels.reduce((value, pixel) => (value << 1) | (pixel >= 128 ? 1 : 0), 0)
  const clockTime = clockFrame / 30
  const ambiguous = pixels.some(pixel => pixel > 80 && pixel < 176)
  if (pixels.length !== 16 || ambiguous || clockTime > duration + 1 / 30) { invalidFrames++; continue }
  if (clockFrame < priorClock) { nonmonotonicFrames++; maximumClockRegressionSeconds = Math.max(maximumClockRegressionSeconds, (priorClock - clockFrame) / 30) }
  priorClock = clockFrame
  visualFrames.push({ frame: index, videoTime, visualTime: clockTime, lagSeconds: videoTime - clockTime })
}
const percentile = (sorted, fraction) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]
const lags = visualFrames.map(frame => frame.lagSeconds).sort((a, b) => a - b)
const absoluteLags = lags.map(Math.abs).sort((a, b) => a - b)
const visualTiming = { method: '16-bit MSB-first binary pixels containing floor(appTime × 30); decoded from raw video before masking', excludedFirstSeconds: .2, eligibleFrames, validFrames: visualFrames.length, invalidFrames, nonmonotonicFrames, maximumClockRegressionSeconds, validFraction: eligibleFrames ? visualFrames.length / eligibleFrames : 0, minimumLagSeconds: lags[0], medianLagSeconds: percentile(lags, .5), percentile95LagSeconds: percentile(lags, .95), maximumLagSeconds: lags.at(-1), percentile95AbsoluteLagSeconds: percentile(absoluteLags, .95), thresholds: readiness.timingThresholds }
visualTiming.passed = visualTiming.validFraction >= .99 && nonmonotonicFrames <= Math.ceil(visualFrames.length * .005) && maximumClockRegressionSeconds <= 1 / 30 + .001 && lags.length > 0 && visualTiming.percentile95LagSeconds <= .25 && visualTiming.maximumLagSeconds <= .5 && visualTiming.minimumLagSeconds >= -.25
metadata.visualTiming = visualTiming
await writeFile(sidecar('.visual-clock.json'), JSON.stringify({ summary: visualTiming, frames: visualFrames }, null, 2))
await saveMetadata()
console.log(JSON.stringify({ visualTiming }, null, 2))
if (!visualTiming.passed) throw Error('Captured visual clock failed timing verification. No export published; inspect the visual-clock sidecar.')
let encoded = resolve(work, 'encoded.mp4')
console.log('Encoding 1080p film with the existing stereo mix; no additional loudness normalization.')
await runAsync(ffmpeg, ['-y', '-ss', String(trimStart), '-i', raw, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-vf', barcodeMask, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart', encoded])
async function measure(path) {
  const result = await runAsync(ffmpeg, ['-hide_banner', '-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'])
  const block = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]
  if (!block) throw Error('Encoded AAC loudness measurement missing.')
  const data = JSON.parse(block)
  const values = { integratedLUFS: Number(data.input_i), truePeakDBTP: Number(data.input_tp), loudnessRangeLU: Number(data.input_lra), thresholdLUFS: Number(data.input_thresh) }
  if (!Object.values(values).every(Number.isFinite)) throw Error('Invalid encoded AAC loudness measurement.')
  return values
}
console.log('Measuring encoded AAC loudness and true peak.')
let loudness = await measure(encoded); let attenuationDB = 0
metadata.initialEncodedLoudness = loudness
for (let attempt = 1; loudness.truePeakDBTP > -1 && attempt <= 2; attempt++) {
  attenuationDB += -1.15 - loudness.truePeakDBTP
  const corrected = resolve(work, `encoded-attenuated-${attempt}.mp4`)
  console.log(`Applying ${attenuationDB.toFixed(2)} dB static attenuation to meet encoded true-peak ceiling.`)
  await runAsync(ffmpeg, ['-y', '-i', encoded, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `volume=${attenuationDB.toFixed(4)}dB`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart', corrected])
  encoded = corrected; loudness = await measure(encoded)
}
if (loudness.truePeakDBTP > -1) throw Error('Encoded audio still exceeds the -1 dBTP ceiling.')
console.log('Verifying the complete encoded video and audio decode.')
await runAsync(ffmpeg, ['-v', 'error', '-xerror', '-i', encoded, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'rawvideo', '-c:a', 'pcm_s16le', '-f', 'null', '-'])
const media = probe(encoded); const visual = media.streams.find(s => s.codec_type === 'video'); const sound = media.streams.find(s => s.codec_type === 'audio')
if (visual.width !== 1920 || visual.height !== 1080 || ratio(visual.r_frame_rate) !== 30 || sound.channels !== 2 || Math.abs(Number(media.format.duration) - duration) > .1) throw Error('Encoded media failed resolution, frame rate, stereo, or duration verification.')
await copyFile(encoded, output)
await copyFile('public/film/captions.srt', sidecar('.srt')); await copyFile('public/film/captions.vtt', sidecar('.vtt'))
Object.assign(metadata, { ready: true, publicationEligible: !partial, completedAt: new Date().toISOString(), media, encodedLoudness: loudness, staticAttenuationDB: attenuationDB, fullDecode: 'passed', subjectiveReview: 'pending', captionScope: partial ? 'Full-timeline captions accompany this partial smoke test; not a publication artifact.' : 'Complete fixed timeline' })
await saveMetadata()
console.log(JSON.stringify({ output, mode: metadata.mode, publicationEligible: !partial, duration: Number(media.format.duration), nativeCaptureFps: captureFps, outputFps: 30, loudness, fullDecode: 'passed', verification: sidecar('.verification.json') }, null, 2))
