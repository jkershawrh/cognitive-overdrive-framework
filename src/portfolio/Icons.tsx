export function Arrow({diagonal=false}:{diagonal?:boolean}) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal?'M6 18 18 6M6 6h12v12':'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.6"/></svg> }
export {BrandMark} from './Brand'
export function Wave(){return <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">{[6,12,18,10,6].map((h,i)=><rect key={i} x={i*4} y={(20-h)/2} width="2" height={h} rx="1" fill="currentColor"/>)}</svg>}
