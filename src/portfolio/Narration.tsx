import {useEffect,useRef,useState} from 'react'
import {Wave} from './Icons'
type Track={id:string;text:string;src:string}
export function Narration({id}:{id:string}){
 const [tracks,setTracks]=useState<Track[]>([]);const [playing,setPlaying]=useState(false);const [captions,setCaptions]=useState(false);const [error,setError]=useState('');const audio=useRef<HTMLAudioElement>(null)
 useEffect(()=>{fetch('/narration/mixed/manifest.json').then(r=>r.ok?r.json():null).then(m=>setTracks(m?.tracks??[])).catch(()=>{})},[])
 useEffect(()=>{setPlaying(false);setError('');audio.current?.load()},[id])
 const track=tracks.find(t=>t.id===id)
 async function toggle(){if(!audio.current||!track)return;if(playing){audio.current.pause();setPlaying(false)}else{try{await audio.current.play();setPlaying(true)}catch{setError('Audio could not play. Read the transcript below.');setCaptions(true)}}}
 return <div className="narration"><button className={`audio-toggle ${playing?'playing':''}`} onClick={toggle} disabled={!track} aria-label={playing?'Pause narration':'Play narration'} title="Kersh · your ElevenLabs voice"><Wave/><span>{playing?'Pause voice':'Hear the story'}</span></button><button className="caption-toggle" onClick={()=>setCaptions(!captions)} aria-expanded={captions} aria-label="Toggle transcript">CC</button><audio ref={audio} src={track?.src} onEnded={()=>setPlaying(false)} onError={()=>{if(track){setError('Audio unavailable. The transcript is available here.');setPlaying(false)}}}/>{captions&&<aside className="transcript"><button onClick={()=>setCaptions(false)} aria-label="Close transcript">×</button><span className="eyebrow">Kersh / chapter narration</span><p>{error}</p><p>{track?.text??'Narration is being prepared with the saved Kersh voice preset.'}</p></aside>}</div>
}
