import {PortfolioEngine} from './portfolio/PortfolioEngine'
import {demoConfig} from './demo.config'
import {lazy,Suspense} from 'react'
const Cinema=lazy(()=>import('./portfolio/Cinema').then(m=>({default:m.Cinema})))
export default function App(){return new URLSearchParams(location.search).has('film')?<Suspense fallback={<div style={{position:'fixed',inset:0,background:'#070909',color:'#eee9dd',display:'grid',placeItems:'center'}}>Preparing the experience…</div>}><Cinema/></Suspense>:<PortfolioEngine story={demoConfig}/>}
