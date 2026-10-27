import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import './SignalSculpture.css'

export type SculptureMode = 'signal' | 'compute' | 'network'
export interface SignalSculptureProps {
  mode?: SculptureMode
  /** Seconds on the film clock. Omit to animate autonomously. */
  time?: number
  className?: string
  style?: CSSProperties
}

type V = [number, number, number]
type Line = { points: V[]; color: string; width?: number; alpha?: number; fill?: string; glow?: number; close?: boolean }
type Particle = { point: V; color: string; radius: number; alpha?: number }
const C = { ink: '#070909', paper: '#eee9dd', lime: '#d7f44c', pink: '#ff349d', cyan: '#58c9ed' }
const TAU = Math.PI * 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mix = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const colors = [C.lime, C.pink, C.cyan]

/** Original Cognitive Overdrive torus: r=125+52cos(t), with x/y/z camera rotation.
 * Adapted from the studio film's Sculpture into a depth-sorted canvas renderer.
 * Geometry is computed in 3D, projected through a perspective camera, then painted.
 */
function torus(phi: number, theta: number, time: number): V {
  const minor = 52 + Math.sin(phi * 3 + time * .35) * 4
  const major = 125 + Math.sin(time * .3) * 3
  const radius = major + minor * Math.cos(theta)
  return [radius * Math.cos(phi), radius * Math.sin(phi), minor * Math.sin(theta)]
}

function curve(a: V, b: V, progress: number, lift = 30): V {
  const p = mix(a, b, progress)
  return [p[0], p[1] - Math.sin(progress * Math.PI) * lift, p[2]]
}

function box(lines: Line[], center: V, size: V, accent: string, bright = false) {
  const [x, y, z] = center, [w, h, d] = size
  const v: V[] = [[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]]
  const faces = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]]
  const fills = ['#0b1415','#152324','#213332','#0a1010','#152025','#101719']
  faces.forEach((face, i) => lines.push({ points: face.map(index => v[index]), close: true, fill: fills[i], color: bright ? accent : '#5d776f', alpha: 1, width: bright ? 1.1 : .7 }))
  lines.push({ points: [v[0],v[4],v[5],v[1]], color: accent, width: bright ? 1.8 : 1, alpha: bright ? .95 : .5, glow: bright ? 8 : 0 })
}

function addTorus(lines: Line[], particles: Particle[], time: number) {
  for (let ring = 0; ring < 36; ring++) {
    const phi = ring / 36 * TAU
    const color = ring % 12 < 4 ? C.cyan : ring % 12 < 8 ? C.pink : C.lime
    for (let arc = 0; arc < 4; arc++) {
      const points = Array.from({ length: 13 }, (_, j) => torus(phi, (arc + j / 12) * Math.PI / 2, time))
      lines.push({ points, color, width: ring % 4 === 0 ? 1.3 : .8, alpha: ring % 4 === 0 ? .78 : .48 })
    }
  }
  for (let ring = 0; ring < 7; ring++) {
    const theta = ring / 7 * TAU
    const points = Array.from({ length: 65 }, (_, j) => torus(j / 64 * TAU, theta, time))
    lines.push({ points, color: C.cyan, width: .5, alpha: .16 })
  }
  for (let i = 0; i < 15; i++) {
    const phi = i / 15 * TAU + time * .14
    const theta = time * (i % 2 ? .6 : -.52) + i * 1.67
    particles.push({ point: torus(phi, theta, time), color: colors[i % 3], radius: i % 4 === 0 ? 2.9 : 1.7 })
    const trail = Array.from({ length: 14 }, (_, j) => torus(phi - j * .007, theta - j * .012, time))
    lines.push({ points: trail, color: colors[i % 3], width: 1.7, alpha: .75, glow: 9 })
  }
}

function addCompute(lines: Line[], particles: Particle[], time: number) {
  const activeLayer = Math.floor(time * .6) % 5
  const explode = .5 + .5 * Math.sin(time * .25)
  for (let layer = 0; layer < 5; layer++) {
    const y = (layer - 2) * (36 + explode * 7)
    const w = 220 - layer * 10, d = 148 - layer * 5
    const accent = colors[layer % 3]
    box(lines, [0, y, 0], [w, 10, d], accent, layer === activeLayer)
    // Etched board traces remain physically attached to each moving plate.
    for (let trace = 0; trace < 5; trace++) {
      const x = -w * .34 + trace * w * .17
      lines.push({ points: [[x,y-5.5,-d*.35],[x,y-5.5,-12],[x+12,y-5.5,0],[x+12,y-5.5,d*.35]], color: accent, width: .75, alpha: .24 })
    }
    for (let socket = 0; socket < 9; socket++) {
      const x = -w * .36 + socket * w * .09
      lines.push({ points: [[x,y-1,d/2+.1],[x+5,y-1,d/2+.1]], color: layer === activeLayer ? accent : '#6d8276', width: 1.3, alpha: .85 })
    }
  }
  const top = -2 * (36 + explode * 7) - 15
  box(lines, [0, top, 0], [72, 12, 65], C.lime, true)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU
    const p: V = [Math.cos(a)*22, top-8, Math.sin(a)*22]
    particles.push({ point: p, color: i % 2 ? C.lime : C.cyan, radius: 1.1, alpha: .8 })
  }
  const upper: V = [132, -108, 54], lower: V = [132, 108, 54]
  lines.push({ points: [upper, lower], color: C.cyan, width: 1, alpha: .5 })
  for (let layer = 0; layer < 5; layer++) {
    const y = (layer - 2) * (36 + explode * 7)
    lines.push({ points: [[(220-layer*10)/2,y,54],[132,y,54]], color: colors[layer%3], alpha: .7, width: 1 })
  }
  for (let i = 0; i < 5; i++) {
    const t = (time * .19 + i / 5) % 1
    particles.push({ point: mix(upper, lower, t), color: C.cyan, radius: 2.2 })
    lines.push({ points: [mix(upper,lower,Math.max(0,t-.06)),mix(upper,lower,t)], color: C.cyan, alpha: .9, width: 2, glow: 7 })
  }
  // Input/output packets make the stack's processing direction legible.
  for (const side of [-1, 1]) {
    const a: V = [side * 225, -15, 0], b: V = [side * 120, -15, 0]
    lines.push({ points: [a,b], color: side < 0 ? C.pink : C.lime, alpha: .4, width: 1 })
    for (let i = 0; i < 3; i++) particles.push({ point: mix(a,b,(time*.22+i/3)%1), color: side<0?C.pink:C.lime, radius: 2 })
  }
}

function addNetwork(lines: Line[], particles: Particle[], time: number) {
  const endpoints: V[] = [[-185,-94,18],[175,-92,-18],[-200,60,-45],[195,68,35],[-55,116,115],[52,-124,-95]]
  const center: V = [0,0,0]
  endpoints.forEach((point, i) => {
    const accent = colors[i % 3]
    box(lines, point, [40,22,36], accent, Math.floor(time*.5)%6 === i)
    const route = Array.from({ length: 25 }, (_, j) => curve(center,point,j/24,24))
    lines.push({ points: route, color: accent, width: 1.1, alpha: .42 })
    for (let packet = 0; packet < 3; packet++) {
      const fraction = (time * .16 + i * .11 + packet / 3) % 1
      const p = i%2 ? fraction : 1-fraction
      particles.push({ point: curve(center,point,p,24), color: accent, radius: 2.2 })
      const start = clamp(p - .06)
      lines.push({ points: Array.from({ length: 8 }, (_, j) => curve(center,point,lerp(start,p,j/7),24)), color: accent, width: 2, alpha: .9, glow: 7 })
    }
  })
  const phi = (1 + Math.sqrt(5)) / 2
  const vertices: V[] = [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
  const faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
  const scale = 27 + Math.sin(time*.8)*1.2
  const spin = time*.15
  const verts = vertices.map(([x,y,z]): V => [(x*Math.cos(spin)-z*Math.sin(spin))*scale,y*scale,(x*Math.sin(spin)+z*Math.cos(spin))*scale])
  faces.forEach((face,i) => lines.push({ points: face.map(index=>verts[index]), close: true, fill: i%3===0?'#342640':i%3===1?'#162e34':'#252f22', color: colors[i%3], width: .9, alpha: .9 }))
  for (const point of verts) particles.push({ point, color: C.paper, radius: 1.3, alpha: .8 })
}

function render(ctx: CanvasRenderingContext2D, mode: SculptureMode, time: number, width: number, height: number, ratio: number) {
  if (width < 1 || height < 1) return
  ctx.setTransform(ratio,0,0,ratio,0,0)
  const size = Math.min(width,height)
  const unit = size / 530
  const cx = width/2, cy = height/2
  const ambient = ctx.createRadialGradient(cx,cy,0,cx,cy,size*.55)
  ambient.addColorStop(0, mode === 'signal' ? '#12201c' : '#0f1a1c')
  ambient.addColorStop(1,C.ink)
  ctx.fillStyle=ambient;ctx.fillRect(0,0,width,height)
  // One camera transform per frame, rather than trigonometry for every vertex.
  const pitch=mode==='signal'?.55+Math.sin(time/6)*.11:.54+Math.sin(time*.13)*.045
  const yaw=mode==='signal'?-.65+time/20:mode==='compute'?-.57+Math.sin(time*.18)*.19:-.22+time*.045
  const cp=Math.cos(pitch),sp=Math.sin(pitch),cyaw=Math.cos(yaw),syaw=Math.sin(yaw)
  const project = (point: V) => {
    const [px,py,pz]=point
    const y=py*cp-pz*sp,zz=py*sp+pz*cp
    const x=px*cyaw+zz*syaw,z=-px*syaw+zz*cyaw
    const perspective = 530/(530-z)
    return { x:cx+x*perspective*unit, y:cy+y*perspective*unit, z, scale:perspective }
  }
  const lines: Line[] = [], particles: Particle[] = []
  if(mode==='signal') addTorus(lines,particles,time)
  else if(mode==='compute') addCompute(lines,particles,time)
  else addNetwork(lines,particles,time)
  // Quiet technical registration plane; not a decorative moving dashboard.
  ctx.strokeStyle='#91a793';ctx.globalAlpha=.13;ctx.lineWidth=.6
  ctx.beginPath();ctx.arc(cx,cy,size*.43,0,TAU);ctx.stroke()
  ctx.setLineDash([1.2,7]);ctx.beginPath();ctx.arc(cx,cy,size*.47,0,TAU);ctx.stroke();ctx.setLineDash([])
  ctx.globalAlpha=.38;ctx.strokeStyle=C.paper;ctx.lineWidth=.8
  for(let i=0;i<4;i++){const angle=i/4*TAU;const x=cx+Math.cos(angle)*size*.46,y=cy+Math.sin(angle)*size*.46;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke()}
  ctx.globalAlpha=1
  const primitives = [
    ...lines.map(line=>{const points=line.points.map(project);return{kind:'line' as const,depth:points.reduce((s,p)=>s+p.z,0)/points.length,line,points}}),
    ...particles.map(particle=>{const point=project(particle.point);return{kind:'particle' as const,depth:point.z,particle,point}}),
  ].sort((a,b)=>a.depth-b.depth)
  ctx.lineJoin='round';ctx.lineCap='round'
  for(const primitive of primitives){
    if(primitive.kind==='line'){
      const {line,points}=primitive
      const depthLight=mode==='signal'?.23+.77*clamp((primitive.depth+180)/360):1
      const alpha=(line.alpha??1)*depthLight
      ctx.globalAlpha=alpha
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(line.close)ctx.closePath()
      if(line.fill){ctx.fillStyle=line.fill;ctx.fill()}
      ctx.strokeStyle=line.color
      // A narrow translucent halo avoids the expensive per-path shadow filter.
      if(line.glow && primitive.depth>-40){ctx.globalAlpha=alpha*.11;ctx.lineWidth=((line.width??1)+4)*unit;ctx.stroke();ctx.globalAlpha=alpha}
      ctx.lineWidth=(line.width??1)*unit;ctx.stroke()
    }else{
      const {particle,point}=primitive
      const radius=particle.radius*unit*point.scale
      const alpha=(particle.alpha??1)*(.35+.65*clamp((point.z+210)/420))
      ctx.fillStyle=particle.color
      ctx.globalAlpha=alpha*.05;ctx.beginPath();ctx.arc(point.x,point.y,radius*4,0,TAU);ctx.fill()
      ctx.globalAlpha=alpha*.18;ctx.beginPath();ctx.arc(point.x,point.y,radius*2,0,TAU);ctx.fill()
      ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(point.x,point.y,radius,0,TAU);ctx.fill()
      ctx.fillStyle=C.paper;ctx.beginPath();ctx.arc(point.x,point.y,radius*.55,0,TAU);ctx.fill()
    }
  }
  ctx.globalAlpha=1
}

const descriptions: Record<SculptureMode,string> = {
  signal: 'A rotating three-dimensional toroidal signal sculpture, with lime, pink, and cyan currents traveling across its curved surface.',
  compute: 'A three-dimensional stack of separated compute plates, with illuminated circuits and packets passing between processing layers.',
  network: 'A faceted three-dimensional core exchanges signals with six spatial endpoint modules.',
}

export function SignalSculpture({ mode='signal', time, className='', style }: SignalSculptureProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dimensions = useRef({width:0,height:0,ratio:1})
  const schedule = useRef<(() => void) | null>(null)
  const origin = useRef<number | null>(null)
  const config = useRef({mode,time})
  config.current={mode,time}
  const reducedMotion = useReducedMotion()
  const manual = time !== undefined

  useLayoutEffect(()=>{
    const element=canvas.current
    if(!element)return
    const context=element.getContext('2d',{alpha:false})
    if(!context)return
    origin.current??=performance.now()
    let frame=0
    const draw=()=>{
      frame=0
      const d=dimensions.current
      const seconds=reducedMotion?0:config.current.time??(performance.now()-origin.current!)/1000
      render(context,config.current.mode,seconds,d.width,d.height,d.ratio)
      if(!manual&&!reducedMotion)frame=requestAnimationFrame(draw)
    }
    // Coalesce resize, mount, and controlled clock changes before the next paint.
    const requestDraw=()=>{if(!frame)frame=requestAnimationFrame(draw)}
    schedule.current=requestDraw
    const resize=()=>{
      const rect=element.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,1,960/Math.max(1,rect.width,rect.height))
      const previous=dimensions.current
      if(previous.width===rect.width&&previous.height===rect.height&&previous.ratio===ratio)return
      dimensions.current={width:rect.width,height:rect.height,ratio}
      element.width=Math.round(rect.width*ratio);element.height=Math.round(rect.height*ratio);requestDraw()
    }
    resize()
    const observer=new ResizeObserver(resize);observer.observe(element)
    requestDraw()
    return()=>{cancelAnimationFrame(frame);observer.disconnect();schedule.current=null}
  },[manual,reducedMotion])

  useLayoutEffect(()=>{
    schedule.current?.()
  },[mode,time,reducedMotion])

  return <div className={`signal-sculpture ${className}`} style={style} data-mode={mode} data-clock={manual?'controlled':'autonomous'}>
    <canvas ref={canvas} role="img" aria-label={descriptions[mode]}/>
  </div>
}
