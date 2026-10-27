#!/usr/bin/env node
/** Join verified exact-frame video sections; encode one continuous master soundtrack. */
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises'
import { resolve, dirname, basename, relative } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const arg = (name, fallback) => { const i = process.argv.indexOf(name); if (i < 0) return fallback; if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(`Missing value for ${name}`); return process.argv[i + 1] }
const ffmpeg = arg('--ffmpeg', process.env.FFMPEG_BIN ?? 'ffmpeg')
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe')
const segmentPaths = arg('--segments', 'output/v2/segment-1.partial.mp4,output/v2/segment-2.partial.mp4,output/v2/segment-3.partial.mp4').split(',').map(path => resolve(path.trim()))
if (new Set(segmentPaths).size !== segmentPaths.length) throw Error('Each segment must appear exactly once.')
if (segmentPaths.some(path => /[\r\n]/.test(path) || !path.endsWith('.mp4'))) throw Error('Segments must be .mp4 paths without line breaks.')
const output = resolve(arg('--output', 'output/v2/cognitive-overdrive-cinematic.mp4'))
if (!output.endsWith('.mp4') || segmentPaths.includes(output)) throw Error('Final output must be a separate .mp4 file.')
const sidecar = suffix => output.replace(/\.mp4$/, suffix)
const work = sidecar('.assembly-work')
const audio = resolve('output/v2/portfolio-master.wav')
const source = await readFile('narration/cinematic-timeline.json', 'utf8')
const timeline = JSON.parse(source)
const fps = 30; const requestedFrameCount = Math.ceil(timeline.total * fps - 1e-8)
const hash = value => createHash('sha256').update(value).digest('hex')
const timelineSha256 = hash(source); const audioSourceSha256 = hash(await readFile(audio))
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
if (JSON.stringify(JSON.parse(await readFile('public/film/timeline.json', 'utf8'))) !== JSON.stringify(timeline)) throw Error('Public and narration timelines differ.')
if (Math.abs(Number(probe(audio).format.duration) - timeline.total) > .02) throw Error('Mixed WAV does not match the fixed timeline duration.')
const formats = run(ffmpeg, ['-hide_banner', '-formats']).stdout
if (!/^\s*D\s+concat\s*$/m.test(formats)) throw Error('FFmpeg concat demuxer is unavailable.')

const segments = []; const frames = []; let expectedStart = 0; let videoSignature
for (const [segmentIndex, path] of segmentPaths.entries()) {
  const metadata = JSON.parse(await readFile(path.replace(/\.mp4$/, '.verification.json'), 'utf8'))
  const frameData = JSON.parse(await readFile(path.replace(/\.mp4$/, '.frames.json'), 'utf8'))
  const label = basename(path)
  if (!metadata.ready || !metadata.exactFrameClockVerified || metadata.fullDecode !== 'passed' || metadata.browserErrors?.length) throw Error(`${label}: rendering and decoding must pass before assembly.`)
  if (metadata.timelineSha256 !== timelineSha256 || metadata.audioSourceSha256 !== audioSourceSha256) throw Error(`${label}: timeline or audio provenance differs from the current master.`)
  const start = metadata.startTime; const duration = metadata.duration; const count = metadata.requestedFrameCount
  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0 || Math.abs(start - expectedStart) > .000001) throw Error(`${label}: segments must cover the full timeline contiguously, in order, starting at zero.`)
  if (!Number.isInteger(count) || count < 1 || !Array.isArray(frameData.frames) || !Number.isFinite(frameData.startTime) || !Number.isFinite(frameData.duration) || metadata.fps !== fps || frameData.fps !== fps || metadata.renderedFrameCount !== count || frameData.renderedFrameCount !== count || frameData.requestedFrameCount !== count || frameData.frames.length !== count || Math.abs(frameData.startTime - start) > 1e-8 || Math.abs(frameData.duration - duration) > 1e-8 || count !== Math.ceil(duration * fps - 1e-8)) throw Error(`${label}: frame-count metadata is inconsistent.`)
  if (segmentIndex < segmentPaths.length - 1 && Math.abs(count / fps - duration) > .000001) throw Error(`${label}: intermediate segment boundaries must fall exactly on 30 fps frame boundaries.`)
  const media = probe(path); const video = media.streams.find(stream => stream.codec_type === 'video')
  if (!video || video.codec_name !== 'h264' || video.width !== 1920 || video.height !== 1080 || ratio(video.r_frame_rate) !== fps || Number(video.nb_frames) !== count || Math.abs(Number(video.duration) - count / fps) > .001 || Math.abs(Number(video.start_time)) > .001) throw Error(`${label}: actual encoded video does not match the declared frames.`)
  const signature = JSON.stringify(Object.fromEntries(['codec_name', 'profile', 'level', 'width', 'height', 'pix_fmt', 'time_base', 'sample_aspect_ratio', 'color_range', 'color_space'].map(key => [key, video[key]])))
  if (videoSignature && signature !== videoSignature) throw Error(`${label}: video encoding parameters differ; lossless concatenation would be unsafe.`)
  videoSignature = signature
  for (const [index, frame] of frameData.frames.entries()) {
    const intended = start + index / fps; const globalIndex = frames.length
    if (!Number.isFinite(frame.requestedTime) || !Number.isFinite(frame.observedTime) || frame.index !== index || Math.abs(frame.requestedTime - intended) > .000001 || Math.abs(frame.observedTime - intended) > .0011 || Math.abs(intended - globalIndex / fps) > .000001) throw Error(`${label}: frame ${index} has an invalid timeline clock.`)
    if (!Array.isArray(frame.media) || frame.media.some(video => !video.paused || video.seeking || video.readyState < 2)) throw Error(`${label}: frame ${index} contains unsettled media.`)
    frames.push({ ...frame, index: globalIndex, segment: segmentIndex + 1, segmentFrame: index })
  }
  segments.push({ path, label, start, duration, frameCount: count, videoDuration: count / fps, metadata })
  expectedStart = start + duration
}
if (Math.abs(expectedStart - timeline.total) > .000001 || frames.length !== requestedFrameCount) throw Error(`Segments must cover all ${timeline.total.toFixed(2)} seconds and ${requestedFrameCount} frames exactly.`)
const segmentSummary = segments.map(({ label, start, duration, frameCount }) => ({ file: label, start, duration, frameCount }))
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ ready: true, segments: segmentSummary, output, duration: timeline.total, requestedFrameCount, audio: 'One continuous output/v2/portfolio-master.wav; segment audio discarded' }, null, 2)); process.exit(0) }

await mkdir(work, { recursive: true }); await mkdir(sidecar('.stills'), { recursive: true }); await mkdir(dirname(output), { recursive: true })
await writeFile(sidecar('.timeline.json'), source)
await writeFile(sidecar('.frames.json'), JSON.stringify({ fps, startTime: 0, duration: timeline.total, requestedFrameCount, renderedFrameCount: frames.length, segments: segmentSummary, frames }, null, 2))
const metadata = { ready: false, publicationEligible: false, mode: 'full film', output: basename(output), startedAt: new Date().toISOString(), duration: timeline.total, fps, requestedFrameCount, renderedFrameCount: frames.length, timelineSha256, audioSourceSha256, exactFrameClockVerified: true, maximumClockRoundingErrorSeconds: Math.max(...frames.map(frame => Math.abs(frame.observedTime - frame.requestedTime))), segments: segmentSummary, browserErrors: [], browserWarnings: segments.flatMap(segment => segment.metadata.browserWarnings ?? []), audioProcessing: 'Segment soundtracks discarded. One continuous finished stereo WAV encoded to AAC; no additional normalization. Static attenuation only if encoded true peak exceeds -1 dBTP.', stills: [] }
const saveMetadata = () => writeFile(sidecar('.verification.json'), JSON.stringify(metadata, null, 2))
await saveMetadata()
for (const segment of segments) {
  for (const still of segment.metadata.stills ?? []) {
    const from = resolve(segment.path.replace(/\.mp4$/, '.frames-work'), still.file)
    const allowed = resolve(segment.path.replace(/\.mp4$/, '.frames-work'), 'stills') + '/'
    if (!from.startsWith(allowed)) throw Error('Still reference is outside its segment stills directory.')
    const filename = `${segment.label.replace(/\.mp4$/, '')}-${basename(still.file)}`
    const to = resolve(sidecar('.stills'), filename)
    await copyFile(from, to)
    metadata.stills.push({ ...still, file: relative(dirname(output), to), segment: segment.label })
  }
}
const concatPath = resolve(work, 'video-segments.ffconcat')
const quoteConcat = path => path.replace(/'/g, "'\\''")
let encoded = resolve(work, 'assembled.mp4')
console.log(`Assembling ${segments.length} verified video sections, ${frames.length} frames, with one continuous soundtrack.`)
try {
  // Removing segment audio before concatenation also removes its AAC priming
  // from demuxer start-time calculations; the final soundtrack starts at zero.
  for (const [index, segment] of segments.entries()) {
    segment.videoOnlyPath = resolve(work, `video-only-${index + 1}.mp4`)
    await runAsync(ffmpeg, ['-y', '-hide_banner', '-i', segment.path, '-map', '0:v:0', '-an', '-c:v', 'copy', '-movflags', '+faststart', segment.videoOnlyPath])
    const clean = probe(segment.videoOnlyPath).streams.find(stream => stream.codec_type === 'video')
    if (Math.abs(Number(clean.start_time)) > .0001 || Number(clean.nb_frames) !== segment.frameCount) throw Error(`${segment.label}: video-only intermediate changed its frame count or zero-time origin.`)
  }
  await writeFile(concatPath, 'ffconcat version 1.0\n' + segments.map(segment => `file '${quoteConcat(segment.videoOnlyPath)}'\nduration ${segment.videoDuration.toFixed(9)}\n`).join(''))
  await runAsync(ffmpeg, ['-y', '-hide_banner', '-f', 'concat', '-safe', '0', '-i', concatPath, '-t', String(timeline.total), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', encoded])
  async function measure(path) {
    const result = await runAsync(ffmpeg, ['-hide_banner', '-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-c:a', 'pcm_s16le', '-f', 'null', '-'])
    const block = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]
    if (!block) throw Error('Encoded AAC loudness measurement missing.')
    const data = JSON.parse(block)
    const values = { integratedLUFS: Number(data.input_i), truePeakDBTP: Number(data.input_tp), loudnessRangeLU: Number(data.input_lra), thresholdLUFS: Number(data.input_thresh) }
    if (!Object.values(values).every(Number.isFinite)) throw Error('Invalid encoded AAC loudness measurement.')
    return values
  }
  console.log('Measuring the complete AAC soundtrack.')
  let loudness = await measure(encoded); let attenuationDB = 0
  metadata.initialEncodedLoudness = loudness
  for (let attempt = 1; loudness.truePeakDBTP > -1 && attempt <= 2; attempt++) {
    attenuationDB += -1.15 - loudness.truePeakDBTP
    const corrected = resolve(work, `assembled-attenuated-${attempt}.mp4`)
    await runAsync(ffmpeg, ['-y', '-i', encoded, '-t', String(timeline.total), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `volume=${attenuationDB.toFixed(4)}dB`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', corrected])
    encoded = corrected; loudness = await measure(encoded)
  }
  if (loudness.truePeakDBTP > -1) throw Error('Encoded audio exceeds the -1 dBTP ceiling.')
  console.log('Verifying every encoded video frame and the complete audio decode.')
  await runAsync(ffmpeg, ['-v', 'error', '-xerror', '-i', encoded, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'rawvideo', '-c:a', 'pcm_s16le', '-f', 'null', '-'])
  const media = probe(encoded); const video = media.streams.find(stream => stream.codec_type === 'video'); const sound = media.streams.find(stream => stream.codec_type === 'audio')
  if (video.codec_name !== 'h264' || video.width !== 1920 || video.height !== 1080 || ratio(video.r_frame_rate) !== fps || Number(video.nb_frames) !== requestedFrameCount || Math.abs(Number(video.start_time)) > .001 || sound.codec_name !== 'aac' || sound.channels !== 2 || Number(sound.sample_rate) !== 48000 || Math.abs(Number(sound.start_time)) > .001 || Math.abs(Number(sound.duration) - timeline.total) > .025 || Math.abs(Number(media.format.duration) - timeline.total) > .1) throw Error('Final media failed video frame count, frame rate, dimensions, audio format, origin, or duration checks.')
  await copyFile(encoded, output)
  await copyFile('public/film/captions.srt', sidecar('.srt')); await copyFile('public/film/captions.vtt', sidecar('.vtt'))
  Object.assign(metadata, { ready: true, publicationEligible: true, completedAt: new Date().toISOString(), media, encodedLoudness: loudness, staticAttenuationDB: attenuationDB, fullDecode: 'passed', videoFrameDurationSeconds: 1 / fps, videoFrameQuantizationSeconds: requestedFrameCount / fps - timeline.total, subjectiveReview: 'pending', captionSource: 'ElevenLabs character alignments on the complete fixed cinematic timeline' })
  await saveMetadata()
  console.log(JSON.stringify({ output, ready: true, duration: Number(media.format.duration), audioDuration: Number(sound.duration), frames: requestedFrameCount, fps, loudness, fullDecode: 'passed', verification: sidecar('.verification.json') }, null, 2))
} catch (error) { metadata.failure = error.message; await saveMetadata(); throw error }
