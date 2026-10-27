import {useEffect,useRef,useState,type CSSProperties} from 'react'
import timeline from '../../narration/cinematic-timeline.json'
import {BrandMark,BrandWordmark} from './Brand'
import {SignalSculpture} from './SignalSculpture'
import {evaluateReviewPrerequisites,scenarioFor,decisionLabels} from './rehearsal-policy'
import './Cinema.css'

type Beat={id:string;at:number;end:number;chapter:number;layout:string;headline:string;kicker:string;asset?:string;mode?:string;step?:string;state?:string;audience?:string;source?:string}
const beats=timeline.beats as Beat[]
const CHAPTERS=['Possibility','The room','The work','Architecture','Proof','Reuse','The return']
const vendors=[{id:'intel',name:'Intel',status:'Reference work'},{id:'amd',name:'AMD',status:'Recorded runs'},{id:'nvidia',name:'NVIDIA',status:'Historical fleet'},{id:'arm',name:'Arm',status:'Portability / qualification open'}]
const renderAsset=(id='compute')=>`/renders/${id}.png`
const format=(t:number)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`

function Media({asset,time,playing,seekRevision}:{asset:string;time:number;playing:boolean;seekRevision:number}){
 const ref=useRef<HTMLVideoElement>(null),elapsed=useRef(time)
 elapsed.current=time
 // Let media play normally. Reposition only for explicit seeks and new metadata.
 useEffect(()=>{
  const video=ref.current;if(!video)return
  const sync=()=>{if(!Number.isFinite(video.duration)||video.duration<=0)return;const target=Math.max(0,elapsed.current)%video.duration;if(Math.abs(video.currentTime-target)>.025)video.currentTime=target}
  video.addEventListener('loadedmetadata',sync)
  if(video.readyState>=1)sync()
  return()=>video.removeEventListener('loadedmetadata',sync)
 },[asset,seekRevision])
 useEffect(()=>{const v=ref.current;if(!v)return;if(playing)void v.play().catch(()=>{});else v.pause()},[playing,asset])
 if(asset==='aeris')return <img className="cinema-media source" src="/images/project-aeris.png" alt="Original AERIS concept workbench" style={{transform:`scale(${1+Math.min(time,12)*.002})`}}/>
 if(asset==='montage')return <div className="cinema-montage">{['bakeoff','edge','aeris'].map((a,i)=><img key={a} src={`/images/project-${a}.png`} alt={`${a} original project media`} style={{transform:`translateY(${Math.sin(time*.35+i)*10}px) rotate(${i===1?2:-2}deg)`}}/>)}</div>
 return <video ref={ref} key={asset} className="cinema-media source" src={`/showcase/${asset}.mp4`} poster={`/images/project-${asset}.png`} muted loop playsInline autoPlay={playing} preload="auto" aria-label={`${asset} original recorded demo`}/>
}

function Flow({step,time}:{step:string;time:number}){
 const parts=step==='praxis'?['Application','Stable gateway','Selected backend']:step==='request'?['Request','?','?']:['Go · coordinate','Python / Java · reason','Events · retain evidence']
 const progress=(time%4)/4
 return <div className={`cinema-flow flow-${step}`} aria-label={`${step} illustrated request flow`}>
  <div className="flow-orbit"><SignalSculpture mode={step==='praxis'?'compute':'network'} time={time}/></div>
  <div className="flow-contract"><span>{step==='praxis'?'SAME APPLICATION CONTRACT':'FOLLOW THE RESPONSIBILITY'}</span><i/></div>
  <div className="flow-nodes">{parts.map((p,i)=><div className={`flow-node ${step==='request'&&i>0?'unrevealed':''}`} key={`${step}-${i}`} style={{transform:`perspective(900px) rotateY(-9deg) translateY(${Math.sin(time*.7+i)*5}px)`}}><small>0{i+1}</small><strong>{p}</strong>{i<2&&<span className="flow-arrow">→</span>}</div>)}</div>
  <div className="flow-route"><span style={{left:`${progress*100}%`}}/></div>
  <div className="flow-foot">{step==='praxis'?'Backend choice stays behind the gateway':step==='request'?'Reveal only what answers the question':'A2A coordination · model and tool boundaries · audit trail'}</div>
 </div>
}

function Proof({state,time}:{state:string;time:number}){
 // This is the same deterministic policy represented by the guided demo.
 const result=evaluateReviewPrerequisites(scenarioFor(state==='missing'?'missing-evidence':state==='denied'?'denied-authority':'complete-evidence'))
 const passed=result.decision==='REVIEW_READY'
 const label=decisionLabels[result.decision]
 const phase=(time%4)/4
 const travel=passed?phase:Math.min(phase,state==='missing'?.35:.64)
 return <div className={`cinema-proof state-${state}`} aria-label={label} data-decision={result.decision}>
  <div className="proof-sculpture"><SignalSculpture mode="compute" time={time}/></div>
  <div className="gate-track"><div className="gate-packet" style={{left:`${5+travel*85}%`}}>REQUEST</div><div className={`gate evidence ${state==='missing'?'shut':''}`}><i/><strong>EVIDENCE</strong><span>{state==='missing'?'MISSING':'PRESENT'}</span></div><div className={`gate authority ${state==='denied'?'shut':''}`}><i/><strong>AUTHORITY</strong><span>{state==='denied'?'WITHDRAWN':'GRANTED'}</span></div></div>
  <div className="gate-result"><span className="gate-light"/><strong>{label}</strong></div>
 </div>
}

function Launchpad({step,time}:{step:string;time:number}){
 const labels=step==='fanout'?['Brief','Demonstrate','Inspect','Build']:['Catalog','Provision','Qualify','Deliver','Reclaim']
 const active=step==='provision'?1:step==='qualify'?2:Math.floor(time/1.6)%labels.length
 return <div className="cinema-launchpad"><img src={renderAsset('launchpad')} alt="Conceptual modular delivery system" style={{transform:`scale(${1+Math.min(time,25)*.0015})`}}/><div className="delivery-rail">{labels.map((label,i)=><div key={label} className={i===active?'active':''}><span className="delivery-cube"><i/></span><strong>{label}</strong>{i<labels.length-1&&<b>→</b>}</div>)}</div><span className="concept-tag">Concept visualization / source-based workflow</span></div>
}

function Visual({beat,time,playing,seekRevision}:{beat:Beat;time:number;playing:boolean;seekRevision:number}){
 const elapsed=time-beat.at
 if(beat.layout==='render')return <><img className="cinema-render" src={renderAsset(beat.asset)} alt={`Conceptual ${beat.asset} system render`} style={{transform:`scale(${1+Math.min(elapsed,25)*.0018}) translateX(${Math.sin(elapsed*.15)*.3}%)`}}/><div className="cinema-vignette"/><span className="concept-tag">Concept visualization</span><div className="render-tracer"/></>
 if(beat.layout==='reel')return <div className={`cinema-reel reel-${beat.asset}`}><Media asset={beat.asset??'montage'} time={elapsed} playing={playing} seekRevision={seekRevision}/></div>
 if(beat.layout==='hardware')return <><img className="cinema-render hardware-render" src={renderAsset('compute')} alt="Illustrated shared platform and interchangeable compute"/><div className="cinema-vignette"/><div className="hardware-stage"><div className="openshift-plane"><img src="/logos/redhat.svg" alt="Red Hat"/><span>Common platform / application contract</span></div><div className="vendor-cartridges">{vendors.map(v=><div key={v.id} className={beat.step==='all'||beat.step===v.id?'active':''}><strong>{v.name}</strong><span>{v.status}</span><i/></div>)}</div><small>Separate evidence states · no cross-vendor benchmark</small></div></>
 if(beat.layout==='flow')return <Flow step={beat.step??'triforce'} time={elapsed}/>
 if(beat.layout==='proof')return <Proof state={beat.state??'ready'} time={elapsed}/>
 if(beat.layout==='launchpad')return <Launchpad step={beat.step??'catalog'} time={elapsed}/>
 if(beat.layout==='evidence')return <div className="evidence-stage"><SignalSculpture mode="network" time={time}/><div className="evidence-planes">{[['01','SOURCE','Inspect the implementation'],['02','RECORD','Inspect the conditions'],['03','SIMULATION','Inspect the rule']].map((x,i)=><div key={x[0]} style={{transform:`perspective(1000px) rotateY(-14deg) translateY(${Math.sin(time*.6+i)*9}px)`}}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</div></div>
 if(beat.layout==='audience'){const internal=['learners','instructors','contributors'].includes(beat.audience??'');const items=internal?[['learners','Learn'],['instructors','Deliver'],['contributors','Contribute']]:[['executive','Decide'],['architect','Inspect'],['sales','Connect'],['internal','Reuse']];return <div className="audience-orbit"><SignalSculpture mode="network" time={time}/><div className="audience-portals">{items.map(([id,label],i)=><div key={id} className={beat.audience===id||beat.audience==='all'?'active':''} style={{transform:`translateY(${Math.sin(time*.6+i)*8}px)`}}><span>0{i+1}</span><strong>{label}</strong></div>)}</div></div>}
 return <div className="cinema-sculpture"><SignalSculpture mode={(beat.mode??'signal') as 'signal'|'compute'|'network'} time={time}/>{beat.layout==='brand'&&<div className="cinema-wordmark"><BrandWordmark width={720}/></div>}</div>
}

export function Cinema(){
 const query=new URLSearchParams(location.search),capture=query.has('capture'),inspect=query.has('inspect'),frames=query.has('frames')
 const initial=Math.min(timeline.total,Math.max(0,Number(query.get('at'))||0))
 const [time,setTime]=useState(initial),[playing,setPlaying]=useState(false),[started,setStarted]=useState(inspect),[captions,setCaptions]=useState(false),[error,setError]=useState(''),[seekRevision,setSeekRevision]=useState(0)
 const audio=useRef<HTMLAudioElement>(null),intro=useRef<HTMLVideoElement>(null),origin=useRef(0),clockTime=useRef(initial)
 const beat=[...beats].reverse().find(b=>b.at<=time)??beats[0]
 const isIntro=time<10,finished=time>=timeline.total-.03
 useEffect(()=>{document.title='Cognitive Overdrive · The cinematic portfolio';return()=>{document.title='Jonathan Kershaw · Cognitive Overdrive'}},[])
 useEffect(()=>{if(!playing)return;let frame=0,previous=-1;const update=()=>{const current=capture?Math.min(timeline.total,(performance.now()-origin.current)/1000):Math.min(timeline.total,audio.current?.currentTime??clockTime.current);const tick=Math.floor(current*30);if(tick!==previous){previous=tick;clockTime.current=current;setTime(current)}if(current>=timeline.total-.03){setPlaying(false);return}frame=requestAnimationFrame(update)};frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame)},[playing,capture])
 useEffect(()=>{const v=intro.current;if(!v)return;if(isIntro)v.currentTime=time;if(playing&&isIntro){void v.play().catch(()=>{})}else v.pause()},[playing,isIntro]) // Keep the original ten-second intro; its embedded audio is muted.
 async function toggle(){if(playing){audio.current?.pause();setPlaying(false);return}setError('');if(finished){clockTime.current=0;setTime(0)}if(!capture){try{if(audio.current){audio.current.currentTime=clockTime.current;await audio.current.play()}}catch{setError('The soundtrack could not load. Please reload and try again.');return}}origin.current=performance.now()-clockTime.current*1000;setStarted(true);setPlaying(true)}
 function seek(t:number){const next=Math.max(0,Math.min(timeline.total,t));clockTime.current=next;setTime(next);setSeekRevision(value=>value+1);origin.current=performance.now()-next*1000;if(audio.current)audio.current.currentTime=next;if(intro.current&&next<10)intro.current.currentTime=next}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/^(INPUT|BUTTON|A)$/.test((e.target as HTMLElement).tagName))return;if(e.code==='Space'){e.preventDefault();void toggle()}if(e.key==='ArrowRight')seek(clockTime.current+10);if(e.key==='ArrowLeft')seek(clockTime.current-10)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)})
 useEffect(()=>{if(!frames)return;const onFrame=(event:Event)=>seek((event as CustomEvent<{time:number}>).detail.time);window.addEventListener('cinema:frame',onFrame);return()=>window.removeEventListener('cinema:frame',onFrame)},[frames])
 const caption=timeline.captions.find(c=>time>=c.start&&time<c.end)
 const headlineSize=Math.min(6.3,39/(Math.max(...beat.headline.split('\n').map(line=>line.length))*.49))
 const reveal=1-Math.pow(1-Math.max(0,Math.min(1,(time-beat.at)/.6)),3)
 const copyStyle={'--headline-size':`clamp(30px,${headlineSize}vw,122px)`,...(frames?{opacity:reveal,transform:`translateY(${(1-reveal)*16}px)`}:{})} as CSSProperties
 return <div className={`cinema ${capture?'is-capture':''} ${inspect?'is-inspect':''} ${frames?'is-frames':''} ${playing?'is-playing':''} layout-${beat.layout}`} data-time={time.toFixed(3)} data-running={playing} data-finished={finished}>
  {capture&&<div aria-hidden="true" className="capture-clock" style={{position:'absolute',bottom:0,left:0,width:128,height:4,display:'flex',zIndex:99999}}>{Array.from({length:16},(_,i)=><i key={i} style={{display:'block',width:8,height:4,background:(Math.floor(time*30)>>(15-i))&1?'#fff':'#000'}}/>)}</div>}
  <audio ref={audio} src="/narration/mixed/portfolio-master.mp3" preload="auto" onError={()=>{if(!capture){audio.current?.pause();setPlaying(false);setError('Soundtrack unavailable. Reload to try again.')}}}/>
  {isIntro&&<video ref={intro} className="original-intro" src="/brand/cognitive-overdrive-intro-v2.mp4" poster="/brand/cognitive-overdrive-intro-poster.png" muted playsInline preload="auto" aria-label="Original Cognitive Overdrive brand introduction"/>}
  <>
   <header className="cinema-header"><BrandMark width={58}/><span>JONATHAN KERSHAW / APPLIED DEMO ENGINEERING</span><span className="cinema-chapter">0{beat.chapter+1} / {CHAPTERS[beat.chapter]}</span></header>
   <div className="cinema-stage"><Visual beat={beat} time={time} playing={playing} seekRevision={seekRevision}/><div className={`cinema-copy ${beat.layout==='reel'?'reel-copy':''}`} style={copyStyle} key={beat.id}><p>{beat.kicker}</p><h1>{beat.headline.split('\n').map((line,i)=><span key={line} className={i===1?'accent':''}>{line}</span>)}</h1></div>{beat.source&&<div className="cinema-source"><span/>{beat.source}</div>}</div>
   <footer className="cinema-footer"><span>COGNITIVE OVERDRIVE</span><div className="cinema-chapter-track">{CHAPTERS.map((c,i)=><i key={c} className={i<=beat.chapter?'done':''}/>)}</div><span>CURIOSITY WITHOUT A SPEED LIMIT</span></footer>
  </>
  {captions&&caption&&<div className="cinema-caption">{caption.text}</div>}
  {!started&&!inspect&&<div className="cinema-start"><BrandWordmark width={530}/><p>A cinematic portfolio by Jonathan Kershaw</p><button data-start="true" onClick={()=>void toggle()}>▶ Play the experience <span>5:31 / sound on</span></button><a href="/">Explore the guided portfolio ↗</a>{error&&<p role="alert">{error}</p>}</div>}
  {started&&!capture&&!inspect&&error&&<p role="alert" className="cinema-playback-error" style={{position:'absolute',left:'4%',right:'4%',bottom:84,zIndex:30,margin:0,padding:'12px 16px',background:'#261b20',border:'1px solid #ff349d',color:'#eee9dd',fontSize:14}}>{error}</p>}
  {started&&!capture&&!inspect&&<div className="cinema-controls"><button onClick={()=>void toggle()} aria-label={playing?'Pause film':'Play film'}>{playing?'Ⅱ':'▶'}</button><span>{format(time)} / {format(timeline.total)}</span><input aria-label="Film position" type="range" min="0" max={timeline.total} step="0.01" value={time} onChange={e=>seek(Number(e.target.value))}/><button onClick={()=>setCaptions(v=>!v)} aria-pressed={captions} aria-label="Toggle film captions">CC</button><button onClick={()=>document.fullscreenElement?void document.exitFullscreen():void document.documentElement.requestFullscreen()} aria-label="Film fullscreen">⛶</button><a href="/">Explore / try it ↗</a></div>}
 </div>
}
