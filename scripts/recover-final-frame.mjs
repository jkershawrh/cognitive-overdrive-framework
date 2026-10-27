#!/usr/bin/env node
/** Recover exactly one missing terminal frame without re-encoding existing frames. */
import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir, copyFile, rename } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const arg = (name, fallback) => { const i=process.argv.indexOf(name); if(i<0)return fallback; const value=process.argv[i+1]; if(!value||value.startsWith('--'))throw Error(`Missing ${name}`); return value }
const base=arg('--url','http://127.0.0.1:5177').replace(/\/$/,'')
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('A local preview URL is required.')
const ffmpeg=arg('--ffmpeg',process.env.FFMPEG_BIN??'ffmpeg'),ffprobe=arg('--ffprobe',process.env.FFPROBE_BIN??'ffprobe')
const output=resolve(arg('--output','output/v2/segment-3.partial.mp4'))
if(!output.endsWith('.partial.mp4'))throw Error('Recovery output must be a .partial.mp4 segment.')
const sidecar=suffix=>output.replace(/\.mp4$/,suffix)
const source=resolve(sidecar('.frames-work'),'encoded.mp4'),work=resolve(sidecar('.frames-work'),'terminal-recovery')
const audio=resolve('output/v2/portfolio-master.wav'),fps=30
const hash=value=>createHash('sha256').update(value).digest('hex')
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'))
const binaryEnv=bin=>bin.includes('/')?{...process.env,DYLD_LIBRARY_PATH:[dirname(resolve(bin)),process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':')}:process.env
function run(bin,args){const result=spawnSync(bin,args,{encoding:'utf8',maxBuffer:24*1024*1024,env:binaryEnv(bin)});if(result.error||result.status!==0)throw Error(String(result.error?.message??result.stderr).slice(-6000));return result}
function runAsync(bin,args,input){return new Promise((accept,reject)=>{const child=spawn(bin,args,{stdio:[input?'pipe':'ignore','pipe','pipe'],env:binaryEnv(bin)});let stdout='',stderr='';child.stdout.on('data',v=>stdout=(stdout+v).slice(-200000));child.stderr.on('data',v=>stderr=(stderr+v).slice(-200000));child.once('error',reject);child.once('close',code=>code===0?accept({stdout,stderr}):reject(Error(stderr||`Command exited ${code}`)));if(input){child.stdin.on('error',reject);child.stdin.end(input)}})}
const probe=path=>JSON.parse(run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',path]).stdout)
const ratio=value=>{const[a,b=1]=String(value).split('/').map(Number);return a/b}
const videoOf=media=>media.streams.find(s=>s.codec_type==='video')
const signature=video=>JSON.stringify(Object.fromEntries(['codec_name','profile','level','width','height','pix_fmt','time_base','sample_aspect_ratio','color_range','color_space'].map(key=>[key,video[key]])))
const assert=(condition,message)=>{if(!condition)throw Error(message)}
const timelineSource=await readFile('narration/cinematic-timeline.json','utf8'),timeline=JSON.parse(timelineSource)
const verificationSource=await readFile(sidecar('.verification.json'),'utf8'),original=JSON.parse(verificationSource)
const ledgerSource=await readFile(sidecar('.frames.json'),'utf8'),ledger=JSON.parse(ledgerSource)
const reference=await readJSON(arg('--reference','output/v2/segment-2.partial.verification.json'))
const timelineSha256=hash(timelineSource),audioSourceSha256=hash(await readFile(audio)),sourceSha256=hash(await readFile(source))
const {startTime,duration,requestedFrameCount:count}=original
assert(!original.ready,'Segment is already marked ready; recovery is not applicable.')
assert(original.timelineSha256===timelineSha256&&reference.timelineSha256===timelineSha256,'Timeline provenance differs from rendered segments.')
assert(reference.ready&&reference.audioSourceSha256===audioSourceSha256,'Current WAV differs from the verified adjacent segment.')
assert(!original.audioSourceSha256||original.audioSourceSha256===audioSourceSha256,'Original segment audio provenance differs.')
assert(JSON.stringify(await readJSON('public/film/timeline.json'))===JSON.stringify(timeline),'Public and source timelines differ.')
assert(original.fps===fps&&Number.isFinite(startTime)&&Number.isFinite(duration)&&count===Math.ceil(duration*fps-1e-8),'Invalid segment timing metadata.')
assert(Math.abs(startTime+duration-timeline.total)<1e-6,'Recovery is restricted to the terminal timeline segment.')
assert(original.renderedFrameCount===count&&ledger.renderedFrameCount===count&&ledger.requestedFrameCount===count&&ledger.frames?.length===count&&ledger.fps===fps&&Math.abs(ledger.startTime-startTime)<1e-8&&Math.abs(ledger.duration-duration)<1e-8,'Frame ledger is incomplete or inconsistent.')
assert(!original.browserErrors?.length,'Original render has unresolved browser errors.')
let maximumClockError=0
for(const[index,frame]of ledger.frames.entries()){
 const expected=startTime+index/fps
 assert(frame.index===index&&Number.isFinite(frame.observedTime)&&Math.abs(frame.requestedTime-expected)<1e-6&&Math.abs(frame.observedTime-expected)<=.0011,`Invalid frame ledger clock at ${index}.`)
 assert(Array.isArray(frame.media)&&frame.media.every(v=>v.paused&&!v.seeking&&v.readyState>=2),`Unsettled original media at frame ${index}.`)
 maximumClockError=Math.max(maximumClockError,Math.abs(frame.observedTime-expected))
}
const sourceMedia=probe(source),sourceVideo=videoOf(sourceMedia),audioMedia=probe(audio)
assert(sourceVideo&&sourceVideo.codec_name==='h264'&&sourceVideo.width===1920&&sourceVideo.height===1080&&ratio(sourceVideo.r_frame_rate)===fps,'Existing video is not the expected 1080p30 H.264 stream.')
assert(Number(sourceVideo.nb_frames)===count-1,'Recovery requires exactly one missing encoded terminal frame.')
assert(Math.abs(Number(sourceVideo.start_time))<.001&&Math.abs(Number(sourceVideo.duration)-(count-1)/fps)<.001,'Existing video timing does not match the retained frame prefix.')
assert(['100','High'].includes(String(sourceVideo.profile))&&sourceVideo.level===40&&sourceVideo.color_range==='pc'&&sourceVideo.color_space==='bt470bg'&&sourceVideo.time_base==='1/15360','Unexpected source encoding parameters; do not append a mismatched tail.')
assert(signature(sourceVideo)===signature(videoOf(reference.media)),'Existing video differs from the verified adjacent segment encoding.')
assert(Math.abs(Number(audioMedia.format.duration)-timeline.total)<.02,'WAV length differs from the fixed film timeline.')
const finalTime=startTime+(count-1)/fps
const plan={output,source,startTime,duration,existingFrames:count-1,restoredFrameIndex:count-1,restoredTime:finalTime,finalFrames:count,videoDuration:count/fps,timelineSha256,audioSourceSha256,sourceSha256}
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({...plan,readyToRecover:true},null,2));process.exit(0)}

await mkdir(work,{recursive:true})
const report={...plan,ready:false,startedAt:new Date().toISOString(),browserErrors:[],browserWarnings:[]}
const saveReport=()=>writeFile(resolve(work,'recovery.json'),JSON.stringify(report,null,2))
await saveReport()
const sourceFiles=['src/portfolio/Cinema.tsx','src/portfolio/Cinema.css','src/portfolio/SignalSculpture.tsx','src/portfolio/SignalSculpture.css']
const appHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,hash(await readFile(path))])))
let browser,context
try{
 console.log(`Checking all ${count-1} retained presentation timestamps.`)
 const decoded=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',source]).stdout).frames
 assert(decoded.length===count-1,'Decoded source frame count differs from container frame count.')
 decoded.forEach((frame,index)=>assert(Math.abs(Number(frame.best_effort_timestamp_time)-index/fps)<.00001,`Source frame ${index} has a gap or invalid timestamp.`))
 console.log(`Rendering only terminal frame ${count-1} at global ${finalTime.toFixed(9)}s.`)
 browser=await chromium.launch({headless:true,args:['--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']})
 context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'no-preference',colorScheme:'dark'})
 const page=await context.newPage();page.setDefaultTimeout(30000)
 page.on('pageerror',error=>report.browserErrors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')report.browserErrors.push(message.text());else if(message.type()==='warning')report.browserWarnings.push(message.text())})
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))report.browserErrors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`)})
 await page.goto(`${base}/?film=1&frames=1&inspect=1`,{waitUntil:'domcontentloaded',timeout:60000})
 await page.locator('.cinema').waitFor()
 // Identical font/image/video warmup and screenshot options to render-frames.mjs.
 await page.evaluate(async()=>{
  await Promise.all([document.fonts.load('16px "DM Sans"'),document.fonts.load('120px Anton'),document.fonts.ready])
  const paths=['/renders/compute.png','/renders/edge.png','/renders/launchpad.png','/images/project-bakeoff.png','/images/project-edge.png','/images/project-aeris.png','/brand/cognitive-overdrive-intro-poster.png','/logos/redhat.svg']
  await Promise.all(paths.map(src=>new Promise((accept,reject)=>{const img=new Image();img.onload=()=>accept(null);img.onerror=()=>reject(Error(`Image preload failed: ${src}`));img.src=src})))
  const videos=[...document.querySelectorAll('video')]
  for(const src of ['/showcase/bakeoff.mp4','/showcase/edge.mp4']){const v=document.createElement('video');v.src=src;v.preload='auto';v.muted=true;videos.push(v)}
  await Promise.all(videos.map(v=>new Promise((accept,reject)=>{v.pause();v.muted=true;if(v.readyState>=3)return accept(null);const timer=setTimeout(()=>reject(Error(`Video preload timed out: ${v.src}`)),20000);v.addEventListener('canplay',()=>{clearTimeout(timer);accept(null)},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(Error(`Video preload failed: ${v.src}`))},{once:true});v.load()})))
  const style=document.createElement('style');style.textContent='*{cursor:none!important}.capture-clock{display:none!important}';document.head.append(style)
 })
 const state=await page.evaluate(async time=>{
  window.dispatchEvent(new CustomEvent('cinema:frame',{detail:{time}}))
  await new Promise(accept=>requestAnimationFrame(()=>requestAnimationFrame(accept)))
  const deadline=performance.now()+15000
  while([...document.querySelectorAll('video')].some(v=>v.seeking||v.readyState<2)){if(performance.now()>deadline)throw Error('Terminal media seek did not settle.');await new Promise(accept=>setTimeout(accept,5))}
  const cinema=document.querySelector('.cinema')
  return {time:Number(cinema?.getAttribute('data-time')),running:cinema?.getAttribute('data-running')==='true',headline:document.querySelector('.cinema-copy h1')?.textContent,media:[...document.querySelectorAll('video')].map(v=>({src:new URL(v.currentSrc||v.src,location.href).pathname,time:v.currentTime,paused:v.paused,readyState:v.readyState,seeking:v.seeking}))}
 },finalTime)
 assert(Math.abs(state.time-finalTime)<=.0011&&!state.running&&state.media.every(v=>v.paused&&!v.seeking&&v.readyState>=2),'Restored frame clock/media failed verification.')
 assert(state.time===ledger.frames.at(-1).observedTime&&state.headline===timeline.beats.at(-1).headline.replace(/\n/g,''),'Restored frame does not match the original terminal ledger and narrative beat.')
 const jpeg=await page.screenshot({type:'jpeg',quality:90,animations:'allow',caret:'hide',scale:'css'})
 assert(Number(await page.locator('.cinema').getAttribute('data-time'))===state.time,'Clock changed while taking the restored screenshot.')
 assert(report.browserErrors.length===0,`Browser errors: ${report.browserErrors.join('; ')}`)
 await writeFile(resolve(work,'terminal-frame.jpg'),jpeg)
 Object.assign(report,{restoredFrame:{index:count-1,requestedTime:finalTime,observedTime:state.time,media:state.media,jpegSha256:hash(jpeg)},appSourceHashes:appHashes})
 await context.close();context=undefined;await browser.close();browser=undefined

 const prefix=resolve(work,'retained-video-only.mp4'),tail=resolve(work,'terminal-video-only.mp4'),concat=resolve(work,'recovered.ffconcat'),joined=resolve(work,'recovered-video-only.mp4')
 await runAsync(ffmpeg,['-y','-hide_banner','-i',source,'-map','0:v:0','-an','-c:v','copy','-movflags','+faststart',prefix])
 await runAsync(ffmpeg,['-y','-hide_banner','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','pipe:0','-map','0:v:0','-an','-frames:v','1','-c:v','libx264','-preset','medium','-crf','18','-profile:v','high','-level:v','4.0','-pix_fmt','yuv420p','-color_range','pc','-colorspace','bt470bg','-r',String(fps),'-video_track_timescale','15360','-movflags','+faststart',tail],jpeg)
 const prefixVideo=videoOf(probe(prefix)),tailVideo=videoOf(probe(tail))
 assert(Number(prefixVideo.nb_frames)===count-1&&Math.abs(Number(prefixVideo.start_time))<.0001&&signature(prefixVideo)===signature(sourceVideo),'Video-only extraction changed the retained prefix.')
 assert(Number(tailVideo.nb_frames)===1&&Math.abs(Number(tailVideo.start_time))<.0001&&signature(tailVideo)===signature(sourceVideo),'Restored frame encoding does not match the original stream.')
 const quote=value=>value.replace(/'/g,"'\\''")
 await writeFile(concat,`ffconcat version 1.0\nfile '${quote(prefix)}'\nduration ${((count-1)/fps).toFixed(9)}\nfile '${quote(tail)}'\nduration ${(1/fps).toFixed(9)}\n`)
 await runAsync(ffmpeg,['-y','-hide_banner','-f','concat','-safe','0','-i',concat,'-map','0:v:0','-an','-c:v','copy','-movflags','+faststart',joined])
 const joinedVideo=videoOf(probe(joined))
 assert(Number(joinedVideo.nb_frames)===count&&Math.abs(Number(joinedVideo.duration)-count/fps)<.001&&signature(joinedVideo)===signature(sourceVideo),'Lossless concatenation failed frame count, duration, or stream compatibility checks.')
 let encoded=resolve(work,'recovered.mp4'),attenuationDB=0
 const mux=async(path,attenuation=0)=>runAsync(ffmpeg,['-y','-hide_banner','-i',joined,'-ss',String(startTime),'-t',String(duration),'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy',...(attenuation?['-af',`volume=${attenuation.toFixed(4)}dB`]:[]),'-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart',path])
 const measure=async path=>{const result=await runAsync(ffmpeg,['-hide_banner','-i',path,'-vn','-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-c:a','pcm_s16le','-f','null','-']);const block=result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];assert(block,'AAC loudness measurement missing.');const data=JSON.parse(block),values={integratedLUFS:Number(data.input_i),truePeakDBTP:Number(data.input_tp),loudnessRangeLU:Number(data.input_lra),thresholdLUFS:Number(data.input_thresh)};assert(Object.values(values).every(Number.isFinite),'Invalid AAC audio statistics.');return values}
 console.log('Muxing the original 110.94-second WAV section; video length is set by its 3,329 frames.')
 await mux(encoded)
 let loudness=await measure(encoded);report.initialEncodedLoudness=loudness
 for(let attempt=1;loudness.truePeakDBTP>-1&&attempt<=2;attempt++){attenuationDB+=-1.15-loudness.truePeakDBTP;encoded=resolve(work,`recovered-attenuated-${attempt}.mp4`);await mux(encoded,attenuationDB);loudness=await measure(encoded)}
 assert(loudness.truePeakDBTP<=-1,'Encoded soundtrack exceeds the -1 dBTP ceiling.')
 console.log('Checking all recovered video timestamps and the complete video/audio decode.')
 await runAsync(ffmpeg,['-v','error','-xerror','-i',encoded,'-map','0:v:0','-map','0:a:0','-c:v','rawvideo','-c:a','pcm_s16le','-f','null','-'])
 const actualFrames=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',encoded]).stdout).frames
 assert(actualFrames.length===count,'Decoded recovered video does not contain exactly the requested frame count.')
 actualFrames.forEach((frame,index)=>assert(Math.abs(Number(frame.best_effort_timestamp_time)-index/fps)<.00001,`Recovered presentation timestamp mismatch at frame ${index}.`))
 const media=probe(encoded),video=videoOf(media),sound=media.streams.find(s=>s.codec_type==='audio')
 assert(signature(video)===signature(sourceVideo)&&Number(video.nb_frames)===count&&ratio(video.r_frame_rate)===fps&&Math.abs(Number(video.duration)-count/fps)<.001&&Math.abs(Number(video.start_time))<.001,'Recovered encoded video failed final format/timing checks.')
 assert(sound?.codec_name==='aac'&&sound.channels===2&&Number(sound.sample_rate)===48000&&Math.abs(Number(sound.start_time))<.001&&Math.abs(Number(sound.duration)-duration)<.025&&Math.abs(Number(media.format.duration)-count/fps)<.025,'Recovered audio/container failed stereo, sample-rate, origin, or duration checks.')
 assert(hash(await readFile(source))===sourceSha256&&hash(await readFile(sidecar('.frames.json')))===hash(ledgerSource)&&hash(await readFile(audio))===audioSourceSha256&&hash(await readFile('narration/cinematic-timeline.json'))===timelineSha256,'An original recovery input changed during execution.')
 assert(await readFile(sidecar('.verification.json'),'utf8')===verificationSource,'Verification metadata changed during recovery.')
 for(const[path,digest]of Object.entries(appHashes))assert(hash(await readFile(path))===digest,`App source changed during recovery: ${path}`)
 Object.assign(report,{ready:true,completedAt:new Date().toISOString(),fullDecode:'passed',decodedFrameCount:actualFrames.length,encodedLoudness:loudness,staticAttenuationDB:attenuationDB,media})
 await saveReport()
 const metadata={...original,ready:true,publicationEligible:false,completedAt:report.completedAt,media,audioSourceSha256,initialEncodedLoudness:report.initialEncodedLoudness,encodedLoudness:loudness,staticAttenuationDB:attenuationDB,exactFrameClockVerified:true,maximumClockRoundingErrorSeconds:maximumClockError,videoFrameDurationSeconds:1/fps,videoFrameQuantizationSeconds:count/fps-duration,fullDecode:'passed',subjectiveReview:'pending',captionSource:'ElevenLabs character alignment mapped onto the fixed cinematic timeline',captionScope:'Full-timeline captions accompany a partial smoke test; not for publication.',browserWarnings:[...(original.browserWarnings??[]),...report.browserWarnings],terminalFrameRecovery:{report:'terminal-recovery/recovery.json',restoredFrame:report.restoredFrame,originalEncodedSha256:sourceSha256,method:'Exact-time browser rerender of one missing terminal frame; retained video frames stream-copied without re-encoding.'}}
 delete metadata.failure
 await copyFile(encoded,`${output}.recovery-tmp`)
 await copyFile('public/film/captions.srt',sidecar('.srt'));await copyFile('public/film/captions.vtt',sidecar('.vtt'))
 await writeFile(sidecar('.verification.json.tmp'),JSON.stringify(metadata,null,2))
 await rename(`${output}.recovery-tmp`,output)
 await rename(sidecar('.verification.json.tmp'),sidecar('.verification.json'))
 console.log(JSON.stringify({output,ready:true,restoredTime:finalTime,frames:count,videoDuration:Number(video.duration),audioDuration:Number(sound.duration),loudness,fullDecode:'passed',frameLedgerPreserved:true},null,2))
}catch(error){Object.assign(report,{ready:false,failure:error.message});await saveReport();throw error}
finally{if(context)await context.close();if(browser)await browser.close()}
