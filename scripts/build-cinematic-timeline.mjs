import {readFile,writeFile,mkdir} from 'node:fs/promises'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const tracks=(await read('public/narration/manifest.json')).tracks
const definitions=await read('narration/cinematic-beats.json')
const chapters=['possibility','decision','work','architecture','proof','multiplier','return']
let cursor=10.5;const schedule=[];const beats=[];const words=[]
for(const [chapter,track] of tracks.entries()){
 const alignment=await read(`narration/production/${track.id}-alignment.json`)
 const tokens=[];let token=null,tag=false
 alignment.characters.forEach((ch,i)=>{
  if(ch==='[')tag=true
  if(!tag){if(/\s/.test(ch)){if(token)tokens.push(token);token=null}else if(token){token.text+=ch;token.end=alignment.character_end_times_seconds[i]}else token={text:ch,start:alignment.character_start_times_seconds[i],end:alignment.character_end_times_seconds[i]}}
  if(ch===']')tag=false
 });if(token)tokens.push(token)
 const text=tokens.map(w=>w.text).join(' ')
 if(text!==track.text)throw Error(`Alignment text mismatch: ${track.id}`)
 const duration=Math.max(track.duration,tokens.at(-1).end)+.08
 schedule.push({...track,start:cursor,duration,chapter:chapters[chapter]})
 words.push(...tokens.map(w=>({...w,start:w.start+cursor,end:w.end+cursor})))
 for(const definition of definitions.filter(b=>b.chapter===chapter)){
  const index=text.indexOf(definition.cue)
  if(index<0)throw Error(`Cue not found: ${definition.cue}`)
  let offset=0;const word=tokens.find(w=>{const found=offset+w.text.length>index;offset+=w.text.length+1;return found})
  beats.push({...definition,id:`${chapter}-${beats.length}`,at:cursor+word.start})
 }
 cursor+=duration+.9
}
const total=cursor-.9+4
beats.forEach((b,i)=>b.end=beats[i+1]?.at??total)
const captions=[];let group=[]
for(const w of words){if(group.length&&(w.end-group[0].start>5||[...group,w].map(x=>x.text).join(' ').length>76||w.start-group.at(-1).end>.6)){captions.push(group);group=[]}group.push(w);if(/[.!?]$/.test(w.text)&&group.length>=5){captions.push(group);group=[]}}
if(group.length)captions.push(group)
const stamp=(n,comma=false)=>{const ms=Math.round(n*1000);return`${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${comma?',':'.'}${String(ms%1000).padStart(3,'0')}`}
const cues=captions.map((g,i)=>({start:g[0].start,end:Math.min(g.at(-1).end+.12,captions[i+1]?.[0].start??total),text:g.map(w=>w.text).join(' ')}))
const timeline={version:2,introSeconds:10,voiceOffset:0,total,schedule,beats,captions:cues,captionSource:'ElevenLabs character timestamps',visualTiming:'Every narrative change is tied to a spoken phrase, not an estimated fraction.'}
await mkdir('public/film',{recursive:true})
await writeFile('narration/cinematic-timeline.json',JSON.stringify(timeline,null,2)+'\n')
await writeFile('public/film/timeline.json',JSON.stringify(timeline))
for(const extension of ['srt','vtt']){const body=cues.map((c,i)=>`${i+1}\n${stamp(c.start,extension==='srt')} --> ${stamp(c.end,extension==='srt')}\n${c.text}\n`).join('\n');await writeFile(`public/film/captions.${extension}`,(extension==='vtt'?'WEBVTT\n\n':'')+body)}
console.log(`Cinematic timeline: ${beats.length} speech-timed beats; ${total.toFixed(2)} seconds; ${cues.length} captions.`)
