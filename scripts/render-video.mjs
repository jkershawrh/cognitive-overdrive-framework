#!/usr/bin/env node
/** Record the real local presentation; mux existing voice takes and aligned captions. */
import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { inflateSync } from 'node:zlib'

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1] }
const base = arg('--url', 'http://127.0.0.1:5177')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(base)) throw Error('Render only a local preview URL.')
const dryRun = process.argv.includes('--dry-run')
const ffmpeg = arg('--ffmpeg', process.env.FFMPEG_BIN ?? 'ffmpeg')
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe')
const output = resolve(arg('--output', 'output/cognitive-overdrive-portfolio.mp4'))
const dir = resolve('output/video-work')
const manifest = JSON.parse(await readFile('public/narration/manifest.json', 'utf8'))
const plan = JSON.parse(await readFile(arg('--plan', 'narration/film-plan.json'), 'utf8'))
const chapters = ['possibility', 'decision', 'work', 'architecture', 'proof', 'multiplier', 'return']
const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)))
const binaryEnv = bin => bin.includes('/') ? { ...process.env, DYLD_LIBRARY_PATH: [dirname(resolve(bin)), process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':') } : process.env
function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: binaryEnv(bin) })
  if (r.error || r.status !== 0) throw Error((r.error?.message ?? r.stderr ?? 'Command failed').slice(-3000))
  return { stdout: r.stdout, stderr: r.stderr }
}
function runAsync(bin, args) {
  return new Promise((accept, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'], env: binaryEnv(bin) })
    let stderr = ''; child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-5000) })
    child.on('error', reject); child.on('close', code => code === 0 ? accept() : reject(Error(stderr)))
  })
}
// The bundled encoder exposes PNG image2pipe, so calibration needs no optional
// FFmpeg filters, extra image libraries, or platform-specific raw-video muxer.
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
const normalize = text => text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
function alignmentWords(alignment) {
  const chars = alignment.characters
  const starts = alignment.character_start_times_seconds
  const ends = alignment.character_end_times_seconds
  if (!Array.isArray(chars) || chars.length !== starts?.length || chars.length !== ends?.length) throw Error('Invalid provider alignment.')
  const clean = []; let insideTag = false
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '[') insideTag = true
    if (!insideTag) for (const character of chars[i]) clean.push({ character, start: starts[i], end: ends[i] })
    if (chars[i] === ']') insideTag = false
  }
  const words = []; let current = null
  for (const char of clean) {
    if (/\s/.test(char.character)) { if (current) words.push(current); current = null }
    else if (current) { current.text += char.character; current.end = char.end }
    else current = { text: char.character, start: char.start, end: char.end }
  }
  if (current) words.push(current)
  return words
}
function phraseTime(words, phrase) {
  const text = words.map(w => w.text).join(' ')
  const position = text.indexOf(phrase)
  if (position < 0) throw Error(`Narration cue not found: ${phrase}`)
  let cursor = 0
  for (const word of words) { if (cursor + word.text.length > position) return word.start; cursor += word.text.length + 1 }
  throw Error(`Narration cue has no timestamp: ${phrase}`)
}
const assets = new Map()
for (const [index, beat] of plan.chapters.entries()) {
  if (beat.track !== `0${index + 1}-${chapters[index]}`) throw Error('Film plan chapter order does not match the story.')
  const track = manifest.tracks.find(t => t.id === beat.track)
  if (!track) throw Error('Missing narration track ' + beat.track)
  const audio = resolve('public', track.src.replace(/^\//, ''))
  if (!audio.startsWith(resolve('public/narration') + '/')) throw Error('Narration must be a local public/narration asset.')
  await access(audio)
  const alignment = JSON.parse(await readFile(resolve('narration/production', `${track.id}-alignment.json`), 'utf8'))
  const words = alignmentWords(alignment)
  if (normalize(words.map(w => w.text).join(' ')) !== normalize(track.text)) throw Error(`Narration/alignment text mismatch: ${track.id}`)
  const duration = Number(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audio]).stdout.trim())
  if (!Number.isFinite(duration) || duration < 1 || words.at(-1).end > duration + .15) throw Error('Invalid narration duration: ' + track.id)
  const actions = (beat.actions ?? []).map(action => ({ ...action, at: Math.max(0, action.cue ? phraseTime(words, action.cue) + (action.offset ?? 0) : duration * action.fraction) })).sort((a, b) => a.at - b.at)
  if (actions.some(a => !Number.isFinite(a.at) || a.at > duration)) throw Error('Film action outside track duration: ' + track.id)
  assets.set(track.id, { track, audio, duration, words, actions })
}
run(ffmpeg, ['-version'])
const filtersAvailable = run(ffmpeg, ['-hide_banner', '-filters']).stdout
for (const filter of ['scale', 'loudnorm', 'amix', 'adelay', 'apad']) if (!new RegExp(`\\b${filter}\\b`).test(filtersAvailable)) throw Error('Required FFmpeg filter missing: ' + filter)
if (dryRun) {
  console.log(JSON.stringify({ ready: true, resolution: '1920×1080', tracks: [...assets.values()].map(a => ({ id: a.track.id, duration: a.duration, captionWords: a.words.length, actions: a.actions.map(({ cue, at, kind, name, project }) => ({ cue, at, kind, name, project })) })), captionSource: 'ElevenLabs character timestamps; no estimated sentence weighting', estimatedDuration: [...assets.values()].reduce((sum, a) => sum + a.duration + 1.4, 2) }, null, 2))
  process.exit(0)
}
await mkdir(dir, { recursive: true }); await mkdir(dirname(output), { recursive: true }); await mkdir(resolve('output/stills'), { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 1920, height: 1080 } }, reducedMotion: 'no-preference', colorScheme: 'light' })
const page = await context.newPage(); page.setDefaultTimeout(8000)
const video = page.video(); const schedule = []; const errors = []; const actionLog = []
page.on('pageerror', error => errors.push(error.message))
let origin = 0; let end = 0
async function closeCase() {
  const close = page.getByRole('button', { name: 'Close project details', exact: true })
  if (await close.isVisible()) await close.click()
}
async function act(action) {
  if (action.kind === 'close-case') return closeCase()
  if (action.kind === 'case') {
    await closeCase()
    const card = page.locator('.project-card').filter({ has: page.getByRole('heading', { name: action.project, exact: true }) })
    if (await card.count()) await card.click()
    else {
      await page.getByRole('button', { name: 'All projects', exact: false }).click()
      await page.locator('.directory-list').getByRole('button', { name: action.project, exact: false }).click()
    }
    await page.getByRole('dialog').getByRole('heading', { name: action.project, exact: true }).waitFor()
    return
  }
  const locator = action.label ? page.getByLabel(action.label, { exact: action.exact ?? false }) : page.getByRole(action.role ?? 'button', { name: action.name, exact: action.exact ?? false })
  if (action.kind === 'check') await locator.check()
  else if (action.kind === 'scroll') { await locator.hover(); await page.mouse.wheel(0, action.y ?? 300) }
  else await locator.click()
}
try {
  await page.goto(base, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '.footer-controls .narration,.footer-controls .notes-toggle,.header-end .circle-button{visibility:hidden} .journey-footer{pointer-events:auto} *{cursor:none!important}' })
  // A fully black calibration pre-roll establishes the exact captured video origin.
  // It is removed by the final trim and never appears in the delivered film.
  await page.evaluate(() => { const cover = document.createElement('div'); cover.id = 'film-calibration'; cover.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647;'; document.body.append(cover) })
  await wait(700)
  await page.locator('#film-calibration').evaluate(el => el.remove()); origin = performance.now()
  for (const [index, beat] of plan.chapters.entries()) {
    if (index > 0) { await closeCase(); await page.getByRole('navigation', { name: 'Story chapters', exact: true }).getByRole('button').nth(index).click() }
    await page.waitForTimeout(500)
    const { track, duration, actions } = assets.get(beat.track)
    const at = (performance.now() - origin) / 1000
    schedule.push({ id: track.id, src: track.src, text: track.text, start: at, duration, chapter: chapters[index] })
    console.log(`Chapter ${index + 1}/${plan.chapters.length}: ${track.id} (${duration.toFixed(1)}s)`, { start: at })
    const began = performance.now()
    for (const action of actions) {
      await wait(began + action.at * 1000 - performance.now())
      await act(action)
      const actual = (performance.now() - began) / 1000
      actionLog.push({ chapter: chapters[index], cue: action.cue ?? action.name ?? action.kind, intended: action.at, completed: actual })
      if (actual - action.at > 2) throw Error(`Film interaction lag exceeded 2 seconds in ${track.id}.`)
    }
    await page.screenshot({ path: resolve('output/stills', `${String(index + 1).padStart(2, '0')}-${chapters[index]}.png`) })
    await wait(began + duration * 1000 + 900 - performance.now())
  }
  await wait(2000); end = performance.now()
} finally { await context.close(); await browser.close() }
if (errors.length) throw Error('Browser errors during recording: ' + errors.join('; '))
const raw = await video.path()
const frameRate = run(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', raw]).stdout.trim().split('/').map(Number)
const captureFps = frameRate[0] / frameRate[1]
if (!Number.isFinite(captureFps) || captureFps < 20 || captureFps > 60) throw Error('Unexpected browser capture frame rate.')
const calibration = spawnSync(ffmpeg, ['-v', 'error', '-i', raw, '-t', '15', '-vf', 'scale=16:9', '-an', '-pix_fmt', 'gray', '-fps_mode', 'passthrough', '-c:v', 'png', '-f', 'image2pipe', '-'], { env: binaryEnv(ffmpeg), maxBuffer: 1024 * 1024 })
if (calibration.error || calibration.status !== 0) throw Error('Calibration decode failed: ' + calibration.stderr?.toString())
const blackEnds = []; let consecutiveBlack = 0
for (const [i, pixels] of calibrationFrames(calibration.stdout).entries()) {
  if (pixels.every(value => value < 8)) consecutiveBlack++
  else { if (consecutiveBlack >= Math.floor(captureFps * .48)) blackEnds.push(i / captureFps); consecutiveBlack = 0 }
}
if (blackEnds.length !== 1) throw Error('Could not uniquely identify video calibration pre-roll.')
const trimStart = blackEnds[0]; const total = (end - origin) / 1000
const timeline = { source: 'RECORDED PORTFOLIO UI; infrastructure demonstrations remain labeled simulation', schedule, actionLog, total, videoCalibrationTrim: trimStart, captionSource: 'ElevenLabs character alignment', audioProcessing: 'Level normalization only; no time stretch' }
await writeFile(resolve(dir, 'schedule.json'), JSON.stringify(timeline, null, 2))

const stamp = n => { const ms = Math.round(n * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
function wrap(text) {
  if (text.length <= 44) return text
  const words = text.split(' '); let best = 1; let difference = Infinity
  for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < difference) { difference = d; best = i } }
  return `${words.slice(0, best).join(' ')}\n${words.slice(best).join(' ')}`
}
let count = 0; const subtitles = []
for (const segment of schedule) {
  const words = assets.get(segment.id).words; const groups = []; let group = []
  for (const word of words) {
    const candidate = [...group, word]
    if (group.length && (candidate.map(w => w.text).join(' ').length > 84 || word.end - group[0].start > 6 || word.start - group.at(-1).end > .6)) { groups.push(group); group = [] }
    group.push(word)
    if (/[.!?]$/.test(word.text) && group.map(w => w.text).join(' ').length >= 28) { groups.push(group); group = [] }
  }
  if (group.length) groups.push(group)
  groups.forEach((cue, index) => {
    const start = segment.start + cue[0].start
    const end = segment.start + Math.min(cue.at(-1).end + .12, groups[index + 1]?.[0].start ?? segment.duration)
    subtitles.push(`${++count}\n${stamp(start)} --> ${stamp(end)}\n${wrap(cue.map(w => w.text).join(' '))}\n`)
  })
}
const srt = output.replace(/\.mp4$/, '.srt'); await writeFile(srt, subtitles.join('\n'))
await writeFile(output.replace(/\.mp4$/, '.vtt'), 'WEBVTT\n\n' + subtitles.join('\n').replace(/(\d\d:\d\d:\d\d),(\d{3})/g, '$1.$2'))
let args = ['-y', '-ss', String(trimStart), '-i', raw]
for (const segment of schedule) args.push('-i', assets.get(segment.id).audio)
const filters = schedule.map((segment, i) => `[${i + 1}:a]adelay=${Math.round(segment.start * 1000)}:all=1[a${i}]`)
filters.push(schedule.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${schedule.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[audio]`)
args.push('-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[audio]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-t', total.toFixed(3), '-movflags', '+faststart', output)
console.log('Encoding narrated 1080p MP4; aligned SRT and WebVTT captions accompany the film…')
await runAsync(ffmpeg, args)
await copyFile(resolve(dir, 'schedule.json'), output.replace(/\.mp4$/, '.timeline.json'))
const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate', '-of', 'json', output]).stdout)
await writeFile(output.replace(/\.mp4$/, '.verification.json'), JSON.stringify({ output: output.split('/').at(-1), subtitles: count, errors, media: probe, subjectiveVoiceReview: 'pending' }, null, 2))
console.log(JSON.stringify({ output, subtitles: count, verification: probe }, null, 2))
