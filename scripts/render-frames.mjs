#!/usr/bin/env node
/** Render exact film-clock frames, then mux the existing finished stereo mix. */
import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const arg = (name, fallback) => { const i = process.argv.indexOf(name); if (i < 0) return fallback; if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(`Missing value for ${name}`); return process.argv[i + 1] }
const base = arg('--url', 'http://127.0.0.1:5177').replace(/\/$/, '')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw Error('Frame rendering requires a local preview URL.')
const ffmpeg = arg('--ffmpeg', process.env.FFMPEG_BIN ?? 'ffmpeg')
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe')
const timelineSource = await readFile('narration/cinematic-timeline.json', 'utf8')
const timeline = JSON.parse(timelineSource)
const startTime = Number(arg('--start', 0))
const duration = Number(arg('--duration', timeline.total - startTime))
if (!Number.isFinite(startTime) || startTime < 0 || !Number.isFinite(duration) || duration < .1 || startTime + duration > timeline.total + .001) throw Error('Start and duration must define at least 0.1 seconds inside the fixed timeline.')
const partial = startTime > 0 || duration < timeline.total - .001
const fps = 30; const frameCount = Math.ceil(duration * fps - 1e-8)
let output = resolve(arg('--output', 'output/v2/cognitive-overdrive-cinematic.mp4'))
if (!output.endsWith('.mp4')) throw Error('Output must have an .mp4 extension.')
if (partial && !/smoke|partial/i.test(basename(output))) output = output.replace(/\.mp4$/, `.smoke-${startTime}-${duration}s.mp4`)
const sidecar = suffix => output.replace(/\.mp4$/, suffix)
const work = sidecar('.frames-work')
const audio = resolve('output/v2/portfolio-master.wav')
const hash = value => createHash('sha256').update(value).digest('hex')
const binaryEnv = bin => bin.includes('/') ? { ...process.env, DYLD_LIBRARY_PATH: [dirname(resolve(bin)), process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':') } : process.env
function run(bin, args) {
  const result = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: binaryEnv(bin) })
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
await Promise.all([audio, 'public/film/timeline.json', 'public/film/captions.srt', 'public/film/captions.vtt', 'public/brand/cognitive-overdrive-intro-v2.mp4', 'public/showcase/bakeoff.mp4', 'public/showcase/edge.mp4'].map(path => access(path)))
if (JSON.stringify(JSON.parse(await readFile('public/film/timeline.json', 'utf8'))) !== JSON.stringify(timeline)) throw Error('Public and narration timelines differ.')
if (Math.abs(Number(probe(audio).format.duration) - timeline.total) > .02) throw Error('The mixed WAV duration differs from the fixed timeline.')
run(ffmpeg, ['-version'])
const readiness = { ready: true, mode: partial ? 'SMOKE TEST — PARTIAL, NOT FOR PUBLICATION' : 'full film', output, startTime, duration, fps, requestedFrameCount: frameCount, timelineDuration: timeline.total, timelineSha256: hash(timelineSource), audio: 'output/v2/portfolio-master.wav', capture: 'Deterministic browser rendering: explicit timeline time, two animation frames, media seek completion, JPEG quality 90', delivery: '1920x1080 at 30 fps', audioProcessing: 'Existing mixed WAV preserved; AAC encoding with static attenuation only if measured encoded true peak exceeds -1 dBTP' }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify(readiness, null, 2)); process.exit(0) }
await mkdir(work, { recursive: true }); await mkdir(resolve(work, 'stills'), { recursive: true }); await mkdir(dirname(output), { recursive: true })
await writeFile(sidecar('.timeline.json'), timelineSource)
const errors = []; const warnings = []; const frames = []; const stills = []
const metadata = { ...readiness, ready: false, publicationEligible: false, browserErrors: errors, browserWarnings: warnings, renderedFrameCount: 0, stills, startedAt: new Date().toISOString() }
const saveMetadata = () => writeFile(sidecar('.verification.json'), JSON.stringify(metadata, null, 2))
await saveMetadata()

let encoded = resolve(work, 'encoded.mp4')
// Limit only the audio input. An output-level -t can round a fractional end
// down and discard the final supplied video frame; the JPEG EOF sets its end.
const encoder = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0', '-ss', String(startTime), '-t', String(duration), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', encoded], { stdio: ['pipe', 'ignore', 'pipe'], env: binaryEnv(ffmpeg) })
let encoderError = null; let encoderStderr = ''; let encoderClosed = false
encoder.stderr.on('data', chunk => { encoderStderr = (encoderStderr + chunk).slice(-100000) })
encoder.on('error', error => { encoderError = error })
encoder.stdin.on('error', error => { encoderError = error })
const encoderExit = new Promise(accept => encoder.once('close', code => { encoderClosed = true; accept(code) }))
let browser; let context
try {
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] })
  context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', colorScheme: 'dark' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); else if (message.type() === 'warning') warnings.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`) })
  await page.goto(`${base}/?film=1&frames=1&inspect=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('.cinema').waitFor()
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load('16px "DM Sans"'), document.fonts.load('120px Anton'), document.fonts.ready])
    const imagePaths = ['/renders/compute.png', '/renders/edge.png', '/renders/launchpad.png', '/images/project-bakeoff.png', '/images/project-edge.png', '/images/project-aeris.png', '/brand/cognitive-overdrive-intro-poster.png', '/logos/redhat.svg']
    await Promise.all(imagePaths.map(src => new Promise((accept, reject) => { const img = new Image(); img.onload = () => accept(null); img.onerror = () => reject(Error(`Image preload failed: ${src}`)); img.src = src })))
    const videos = [...document.querySelectorAll('video')]
    for (const src of ['/showcase/bakeoff.mp4', '/showcase/edge.mp4']) { const v = document.createElement('video'); v.src = src; v.preload = 'auto'; v.muted = true; videos.push(v) }
    await Promise.all(videos.map(v => new Promise((accept, reject) => {
      v.pause(); v.muted = true
      if (v.readyState >= 3) return accept(null)
      const timeout = setTimeout(() => reject(Error(`Video preload timed out: ${v.src}`)), 20000)
      v.addEventListener('canplay', () => { clearTimeout(timeout); accept(null) }, { once: true })
      v.addEventListener('error', () => { clearTimeout(timeout); reject(Error(`Video preload failed: ${v.src}`)) }, { once: true }); v.load()
    })))
    const style = document.createElement('style'); style.textContent = '*{cursor:none!important}.capture-clock{display:none!important}'; document.head.append(style)
  })
  const representative = new Set(['0-0', '0-3', '1-8', '2-14', '2-15', '2-16', '2-22', '3-27', '4-36', '4-37', '5-42', '5-47', '6-54'])
  const stillTargets = new Map(timeline.beats.filter(beat => representative.has(beat.id) && beat.at + .85 >= startTime && beat.at + .85 < startTime + duration).map(beat => [Math.ceil((beat.at + .85 - startTime) * fps), beat]))
  const started = performance.now(); let nextLog = 0
  console.log(`Rendering ${frameCount} deterministic frames (${duration.toFixed(2)} seconds of film).`)
  for (let index = 0; index < frameCount; index++) {
    if (encoderError || encoderClosed) throw Error(`Encoder stopped: ${encoderError?.message ?? encoderStderr}`)
    const requestedTime = startTime + index / fps
    const state = await page.evaluate(async time => {
      window.dispatchEvent(new CustomEvent('cinema:frame', { detail: { time } }))
      await new Promise(accept => requestAnimationFrame(() => requestAnimationFrame(accept)))
      const deadline = performance.now() + 15000
      while ([...document.querySelectorAll('video')].some(v => v.seeking || v.readyState < 2)) {
        if (performance.now() > deadline) throw Error(`Media seek did not settle at frame time ${time}.`)
        await new Promise(accept => setTimeout(accept, 5))
      }
      const cinema = document.querySelector('.cinema')
      return { time: Number(cinema?.getAttribute('data-time')), running: cinema?.getAttribute('data-running') === 'true', media: [...document.querySelectorAll('video')].map(v => ({ src: new URL(v.currentSrc || v.src, location.href).pathname, time: v.currentTime, paused: v.paused, readyState: v.readyState, seeking: v.seeking })) }
    }, requestedTime)
    if (!Number.isFinite(state.time) || Math.abs(state.time - requestedTime) > .0011) throw Error(`App frame clock mismatch: requested ${requestedTime}, received ${state.time}.`)
    if (state.running || state.media.some(v => !v.paused || v.seeking || v.readyState < 2)) throw Error(`Frame ${index} was not stationary and ready.`)
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 90, animations: 'allow', caret: 'hide', scale: 'css' })
    // Await the writable callback: each image reaches the encoder before producing
    // another one, so slow encoding cannot accumulate unbounded JPEG buffers.
    await new Promise((accept, reject) => encoder.stdin.write(jpeg, error => error ? reject(error) : accept()))
    frames.push({ index, requestedTime, observedTime: state.time, media: state.media })
    const beat = stillTargets.get(index)
    if (beat) { const file = `${beat.id}-${beat.layout}.jpg`; await writeFile(resolve(work, 'stills', file), jpeg); stills.push({ file: `stills/${file}`, beat: beat.id, time: requestedTime }) }
    metadata.renderedFrameCount = index + 1
    const elapsed = (performance.now() - started) / 1000
    if (elapsed >= nextLog || index === frameCount - 1) { console.log(`Frames ${index + 1}/${frameCount}; film ${requestedTime.toFixed(2)}s; elapsed ${elapsed.toFixed(1)}s`); nextLog = elapsed + 20; await saveMetadata() }
  }
  if (errors.length) throw Error('Browser errors: ' + errors.join('; '))
  metadata.frameRenderElapsedSeconds = (performance.now() - started) / 1000
  encoder.stdin.end()
  console.log('All exact-time frames delivered; finishing H.264/AAC encoding.')
  const exitCode = await encoderExit
  if (encoderError || exitCode !== 0) throw Error(`Encoder failed: ${encoderError?.message ?? encoderStderr}`)
} catch (error) {
  metadata.failure = error.message
  if (!encoderClosed) encoder.kill('SIGTERM')
  throw error
} finally {
  if (context) await context.close(); if (browser) await browser.close()
  await writeFile(sidecar('.frames.json'), JSON.stringify({ fps, startTime, duration, requestedFrameCount: frameCount, renderedFrameCount: frames.length, frames }, null, 2))
  await saveMetadata()
}

async function measure(path) {
  const result = await runAsync(ffmpeg, ['-hide_banner', '-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-c:a', 'pcm_s16le', '-f', 'null', '-'])
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
  await runAsync(ffmpeg, ['-y', '-i', encoded, '-ss', String(startTime), '-t', String(duration), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `volume=${attenuationDB.toFixed(4)}dB`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', corrected])
  encoded = corrected; loudness = await measure(encoded)
}
if (loudness.truePeakDBTP > -1) throw Error('Encoded audio exceeds the -1 dBTP ceiling.')
console.log('Verifying the complete encoded video and audio decode.')
await runAsync(ffmpeg, ['-v', 'error', '-xerror', '-i', encoded, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'rawvideo', '-c:a', 'pcm_s16le', '-f', 'null', '-'])
const media = probe(encoded); const visual = media.streams.find(stream => stream.codec_type === 'video'); const sound = media.streams.find(stream => stream.codec_type === 'audio')
if (visual.width !== 1920 || visual.height !== 1080 || ratio(visual.r_frame_rate) !== fps || Number(visual.nb_frames) !== frameCount || Math.abs(Number(visual.duration) - frameCount / fps) > .001 || Math.abs(Number(visual.start_time)) > .001 || sound.channels !== 2 || Math.abs(Number(sound.start_time)) > .001 || Math.abs(Number(sound.duration) - duration) > .025 || Math.abs(Number(media.format.duration) - duration) > .1) throw Error('Encoded media failed resolution, frame rate, frame count, stereo, origin, or stream-duration verification.')
await copyFile(encoded, output)
await copyFile('public/film/captions.srt', sidecar('.srt')); await copyFile('public/film/captions.vtt', sidecar('.vtt'))
Object.assign(metadata, { ready: true, publicationEligible: !partial, completedAt: new Date().toISOString(), media, audioSourceSha256: hash(await readFile(audio)), encodedLoudness: loudness, staticAttenuationDB: attenuationDB, exactFrameClockVerified: true, maximumClockRoundingErrorSeconds: Math.max(...frames.map(frame => Math.abs(frame.observedTime - frame.requestedTime))), videoFrameDurationSeconds: 1 / fps, videoFrameQuantizationSeconds: frameCount / fps - duration, fullDecode: 'passed', subjectiveReview: 'pending', captionSource: 'ElevenLabs character alignment mapped onto the fixed cinematic timeline', captionScope: partial ? 'Full-timeline captions accompany a partial smoke test; not for publication.' : 'Complete fixed timeline' })
await saveMetadata()
console.log(JSON.stringify({ output, mode: metadata.mode, publicationEligible: !partial, renderedFrameCount: frames.length, duration: Number(media.format.duration), exactFrameClockVerified: true, loudness, fullDecode: 'passed', verification: sidecar('.verification.json') }, null, 2))
