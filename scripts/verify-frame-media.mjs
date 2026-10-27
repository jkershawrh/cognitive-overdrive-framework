#!/usr/bin/env node
/** Read-only verification of deterministic frame clocks and embedded-video seeks. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { spawnSync } from 'node:child_process'

const arg = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1] }
const inputs = arg('--frames', 'output/v2/segment-1.partial.frames.json,output/v2/segment-2.partial.frames.json,output/v2/segment-3.partial.frames.json').split(',').map(path => path.trim())
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe')
const timeline = JSON.parse(await readFile('narration/cinematic-timeline.json', 'utf8'))
const fps = 30; const epsilon = .0011
// Source clips have discrete frames. This validates their recorded media clock
// to one source-frame interval, independently of the much tighter scene clock.
// Frame indices below are inferred from reported currentTime, not pixel OCR.
const timestampPrecisionSeconds = .000005
const binaryEnv = ffprobe.includes('/') ? { ...process.env, DYLD_LIBRARY_PATH: [dirname(resolve(ffprobe)), process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':') } : process.env
const durations = new Map(); const sourceRates = new Map()
const ratio = value => { const [a, b = 1] = value.split('/').map(Number); return a / b }
for (const src of ['/brand/cognitive-overdrive-intro-v2.mp4', '/showcase/bakeoff.mp4', '/showcase/edge.mp4']) {
  const result = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,duration,r_frame_rate,avg_frame_rate:format=duration', '-of', 'json', resolve('public', src.slice(1))], { encoding: 'utf8', env: binaryEnv })
  if (result.error || result.status !== 0) throw Error(`Could not inspect ${src}: ${result.error?.message ?? result.stderr}`)
  const data = JSON.parse(result.stdout)
  const video = data.streams.find(stream => stream.codec_type === 'video')
  const duration = Number(video?.duration ?? data.format.duration)
  const rate = ratio(video.r_frame_rate)
  if (!Number.isFinite(duration) || duration <= 0) throw Error(`Invalid video duration: ${src}`)
  if (!Number.isFinite(rate) || rate <= 0 || Math.abs(ratio(video.avg_frame_rate) - rate) > .000001) throw Error(`Source does not have a validated constant frame cadence: ${src}`)
  durations.set(src, duration)
  sourceRates.set(src, rate)
}
function expectedMedia(time) {
  if (time < timeline.introSeconds) return { src: '/brand/cognitive-overdrive-intro-v2.mp4', time }
  const beat = [...timeline.beats].reverse().find(beat => beat.at <= time) ?? timeline.beats[0]
  if (beat.layout !== 'reel' || !['bakeoff', 'edge'].includes(beat.asset)) return null
  const src = `/showcase/${beat.asset}.mp4`
  return { src, time: Math.max(0, time - beat.at) % durations.get(src), beat: beat.id }
}

const issues = []; const joins = []; const mediaCounts = {}; const mediaErrors = {}; const samples = new Map(); let previous = null; let count = 0; let maximumClockError = 0
for (const path of inputs) {
  const data = JSON.parse(await readFile(path, 'utf8'))
  if (!Array.isArray(data.frames) || data.frames.length !== data.renderedFrameCount || data.renderedFrameCount !== data.requestedFrameCount || data.fps !== fps) throw Error(`Frame metadata incomplete: ${path}`)
  if (previous && data.frames[0]) joins.push({ from: previous.file, to: basename(path), before: previous.time, after: data.frames[0].requestedTime, expectedStep: 1 / fps })
  for (const [index, frame] of data.frames.entries()) {
    const time = frame.requestedTime
    const label = `${basename(path)} frame ${index}`
    if (!Number.isFinite(time) || !Number.isFinite(frame.observedTime) || !Array.isArray(frame.media)) { issues.push(`${label}: invalid time or media data`); continue }
    const clockError = Math.abs(time - frame.observedTime); maximumClockError = Math.max(maximumClockError, clockError)
    if (clockError > epsilon || Math.abs(time - count / fps) > .000001) issues.push(`${label}: requested/observed/global clock mismatch`)
    if (previous && Math.abs(time - previous.time - 1 / fps) > .000001) issues.push(`${label}: frame gap or overlap`)
    const expected = expectedMedia(time)
    if (frame.media.length !== (expected ? 1 : 0)) issues.push(`${label}: expected ${expected ? expected.src : 'no video'}, found ${frame.media.length} videos`)
    for (const media of frame.media) {
      if (!expected || media.src !== expected.src) { issues.push(`${label}: unexpected media ${media.src}`); continue }
      if (!Number.isFinite(media.time) || !media.paused || media.seeking || media.readyState < 2) issues.push(`${label}: video not ready and stationary`)
      const offsetError = Math.abs(media.time - expected.time)
      const signedError = media.time - expected.time
      const sourceRate = sourceRates.get(media.src)
      const tolerance = 1 / sourceRate + timestampPrecisionSeconds
      const sourceFrameIndexDifference = Math.floor((media.time + timestampPrecisionSeconds) * sourceRate) - Math.floor((expected.time + timestampPrecisionSeconds) * sourceRate)
      mediaCounts[media.src] = (mediaCounts[media.src] ?? 0) + 1
      mediaErrors[media.src] = Math.max(mediaErrors[media.src] ?? 0, offsetError)
      if (!samples.has(media.src)) samples.set(media.src, [])
      samples.get(media.src).push({ filmTime: time, expectedTime: expected.time, reportedTime: media.time, signedError, sourceFrameIndexDifference })
      if (!Number.isFinite(offsetError) || offsetError > tolerance || Math.abs(sourceFrameIndexDifference) > 1) issues.push(`${label}: ${media.src} currentTime ${media.time} differs from expected ${expected.time} by ${offsetError}s (${sourceFrameIndexDifference} source frames)`)
    }
    previous = { time, file: basename(path) }; count++
  }
}
const expectedCount = Math.ceil(timeline.total * fps - 1e-8)
if (count !== expectedCount) issues.push(`Expected complete film ${expectedCount} frames, found ${count}`)
const mediaFidelity = Object.fromEntries([...samples.entries()].map(([src, items]) => {
  const sourceFps = sourceRates.get(src); const tolerance = 1 / sourceFps + timestampPrecisionSeconds
  const first = items[0]; const last = items.at(-1)
  const meanTime = items.reduce((sum, sample) => sum + sample.filmTime, 0) / items.length
  const meanError = items.reduce((sum, sample) => sum + sample.signedError, 0) / items.length
  const variance = items.reduce((sum, sample) => sum + (sample.filmTime - meanTime) ** 2, 0)
  const slope = variance ? items.reduce((sum, sample) => sum + (sample.filmTime - meanTime) * (sample.signedError - meanError), 0) / variance : 0
  const endpointDriftSeconds = last.signedError - first.signedError
  const fittedDriftAcrossClipSeconds = slope * (last.filmTime - first.filmTime)
  const maxSourceFrameIndexDifference = Math.max(...items.map(sample => Math.abs(sample.sourceFrameIndexDifference)))
  const backwardsSamples = items.slice(1).filter((sample, index) => sample.reportedTime < items[index].reportedTime - timestampPrecisionSeconds).length
  const noAccumulatingDrift = Math.abs(endpointDriftSeconds) <= tolerance && Math.abs(fittedDriftAcrossClipSeconds) <= tolerance && backwardsSamples === 0
  if (!noAccumulatingDrift) issues.push(`${src}: media clock accumulated drift or moved backwards`)
  return [src, { sourceFps, sourceFrameIntervalSeconds: 1 / sourceFps, toleranceSeconds: tolerance, samples: items.length, maximumAbsoluteOffsetSeconds: mediaErrors[src], maxSourceFrameIndexDifference, samplesOnDifferentSourceFrame: items.filter(sample => sample.sourceFrameIndexDifference !== 0).length, firstOffsetSeconds: first.signedError, lastOffsetSeconds: last.signedError, endpointDriftSeconds, fittedDriftAcrossClipSeconds, backwardsSamples, noAccumulatingDrift }]
}))
const report = { passed: issues.length === 0, frames: count, expectedFrames: expectedCount, fps, finalFrameTime: previous?.time, timelineDuration: timeline.total, maximumClockErrorSeconds: maximumClockError, sceneClockToleranceSeconds: epsilon, mediaFidelitySemantics: 'Embedded video timestamps must remain within one measured source-frame interval; source-frame index inferred from currentTime must differ by at most one. This does not claim subframe source-video accuracy. Authored scene clocks are checked separately.', timestampPrecisionSeconds, mediaCounts, maximumMediaOffsetErrorsSeconds: mediaErrors, mediaFidelity, joins, issues }
const serialized = JSON.stringify(report, null, 2)
if (arg('--report')) await writeFile(resolve(arg('--report')), serialized + '\n')
console.log(serialized)
if (issues.length) process.exitCode = 1
