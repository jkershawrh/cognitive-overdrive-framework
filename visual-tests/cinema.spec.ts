import { expect, test, type Page, type TestInfo } from '@playwright/test'
import timeline from '../narration/cinematic-timeline.json' with { type: 'json' }

type Beat = (typeof timeline.beats)[number]
const frameAt = (beat: Beat) => beat.at + .8
const normalized = (value: string) => value.replace(/\s+/g, ' ').trim()

async function inspect(page: Page, beat: Beat, at = frameAt(beat)) {
  await page.goto(`/?film&inspect&at=${at}`)
  await expect(page.locator('.cinema')).toHaveAttribute('data-running', 'false')
  await expect(page.locator('.cinema-copy h1')).toHaveText(beat.headline.replace(/\n/g, ''), { useInnerText: false })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.cinema-stage img').evaluateAll(async images => {
    await Promise.all(images.map(image => (image as HTMLImageElement).decode()))
  })
}

async function assertTextFits(page: Page, description: string) {
  const geometry = await page.evaluate(() => {
    const copy = document.querySelector('.cinema-copy')!.getBoundingClientRect()
    const rect = (r: DOMRect) => ({ left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height })
    const textRects = (selector: string) => [...document.querySelectorAll(selector)].flatMap(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => ({ ...rect(r), text: element.textContent?.trim() }))
    })
    return {
      viewport: { width:innerWidth, height:innerHeight },
      document: { width:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight },
      copy:rect(copy),
      headline:textRects('.cinema-copy h1>span'),
      supporting:textRects('.cinema-copy>p, .cinema-source, .concept-tag, .flow-node strong, .flow-foot, .flow-contract>span, .gate-result>strong, .gate>strong, .gate>span, .gate-packet, .vendor-cartridges strong, .vendor-cartridges>div>span, .hardware-stage>small, .openshift-plane>span, .delivery-rail strong, .evidence-planes strong, .evidence-planes small, .audience-portals strong'),
    }
  })
  expect(geometry.headline.length, `${description}: visible headline text`).toBeGreaterThan(0)
  expect(geometry.document.width, `${description}: horizontal page overflow`).toBeLessThanOrEqual(geometry.viewport.width + 1)
  expect(geometry.document.height, `${description}: vertical page overflow`).toBeLessThanOrEqual(geometry.viewport.height + 1)
  for (const text of [...geometry.headline, ...geometry.supporting]) {
    const label = `${description}: “${text.text}”`
    expect(text.left, `${label} extends beyond left edge`).toBeGreaterThanOrEqual(-1)
    expect(text.right, `${label} extends beyond right edge`).toBeLessThanOrEqual(geometry.viewport.width + 1)
    expect(text.top, `${label} extends above the viewport`).toBeGreaterThanOrEqual(-1)
    expect(text.bottom, `${label} extends below the viewport`).toBeLessThanOrEqual(geometry.viewport.height + 1)
  }
  for (const line of geometry.headline) {
    expect(line.left, `${description}: headline escapes the copy area`).toBeGreaterThanOrEqual(geometry.copy.left - 1)
    expect(line.right, `${description}: headline extends through the visual`).toBeLessThanOrEqual(geometry.copy.right + 1)
  }
}

async function inspectWithFailureFrame(page: Page, beat: Beat, testInfo: TestInfo) {
  try {
    await inspect(page, beat)
    await assertTextFits(page, `${beat.id} / ${beat.layout} at ${frameAt(beat).toFixed(3)}s`)
  } catch(error) {
    await testInfo.attach(`cinema-${beat.id}-${beat.layout}`, { body:await page.screenshot(), contentType:'image/png' })
    throw error
  }
}

test('all 56 cinematic beats keep actual text inside the 1080p composition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stage-1080p', 'Full beat audit targets the delivered film resolution.')
  test.setTimeout(150_000)
  expect(timeline.beats).toHaveLength(56)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const beat of timeline.beats) {
    await test.step(`${beat.id}: ${normalized(beat.headline)} @ ${frameAt(beat).toFixed(3)}s`, async () => {
      await inspectWithFailureFrame(page, beat, testInfo)
      expect(errors, `Browser errors by beat ${beat.id}`).toEqual([])
    })
  }
})

test('each cinematic layout and the longest closing line fit a phone', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'Representative mobile composition audit.')
  test.setTimeout(90_000)
  const byLayout = new Map(timeline.beats.map(beat => [beat.layout, beat]))
  const longest = [...timeline.beats].sort((a,b) => b.headline.length-a.headline.length)[0]
  const samples = [...new Map([...byLayout.values(), longest, timeline.beats.at(-1)!].map(beat => [beat.id,beat])).values()]
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for(const beat of samples) await test.step(`${beat.layout}: ${normalized(beat.headline)}`, async () => {
    await inspectWithFailureFrame(page, beat, testInfo)
  })
  expect(errors).toEqual([])
})

test('spoken missing-evidence and permission cues produce the appropriate policy outcome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'laptop', 'Covered at film and phone sizes.')
  const cases = [
    { cue:'A convincing demonstration', decision:'REVIEW_READY', result:'Ready for review', evidence:'PRESENT', authority:'GRANTED' },
    { cue:'What happens when the evidence is missing?', decision:'EVIDENCE_REQUIRED', result:'Held for evidence', evidence:'MISSING', authority:'GRANTED' },
    { cue:'What if permission is withdrawn?', decision:'AUTHORITY_REQUIRED', result:'Stopped at authority', evidence:'PRESENT', authority:'WITHDRAWN' },
  ]
  for(const scenario of cases) {
    const beat = timeline.beats.find(item => item.cue === scenario.cue)!
    expect(beat, `A visual beat accompanies “${scenario.cue}”`).toBeDefined()
    await inspect(page,beat,beat.at+Math.min(3.5,beat.end-beat.at-.1))
    const proof=page.locator('.cinema-proof')
    await expect(proof).toHaveAttribute('data-decision',scenario.decision)
    await expect(proof.locator('.gate-result')).toHaveText(scenario.result)
    await expect(proof.locator('.gate.evidence>span')).toHaveText(scenario.evidence)
    await expect(proof.locator('.gate.authority>span')).toHaveText(scenario.authority)
    await expect(page.locator('.cinema-source')).toContainText('SIMULATION')
    const positions=await proof.evaluate(element=>{
      const packet=element.querySelector('.gate-packet')!.getBoundingClientRect()
      const evidence=element.querySelector('.gate.evidence')!.getBoundingClientRect()
      const authority=element.querySelector('.gate.authority')!.getBoundingClientRect()
      return { packetCenter:(packet.left+packet.right)/2, evidence:evidence.left, authority:authority.left }
    })
    if(scenario.decision==='EVIDENCE_REQUIRED') expect(positions.packetCenter,'Missing evidence blocks progress at the first boundary').toBeLessThan(positions.evidence)
    if(scenario.decision==='AUTHORITY_REQUIRED') expect(positions.packetCenter,'Denied authority blocks progress at the second boundary').toBeLessThan(positions.authority)
    if(scenario.decision==='REVIEW_READY') expect(positions.packetCenter,'Complete prerequisites allow the illustrated handoff').toBeGreaterThan(positions.authority)
  }
})

test('architecture, hardware, and delivery visuals follow their spoken cues', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stage-1080p', 'Semantic cue checks are viewport independent.')
  test.setTimeout(60_000)
  const flowCases = [
    {cue:'Trace the request',labels:['Request','?','?']},
    {cue:'In Triforce',labels:['Go · coordinate','Python / Java · reason','Events · retain evidence']},
    {cue:'In the Praxis lab',labels:['Application','Stable gateway','Selected backend']},
  ]
  for(const scenario of flowCases){
    const beat=timeline.beats.find(item=>item.cue===scenario.cue)!
    await inspect(page,beat)
    await expect(page.locator('.flow-node strong')).toHaveText(scenario.labels)
    if(scenario.cue==='In the Praxis lab') await expect(page.locator('.flow-contract')).toContainText('SAME APPLICATION CONTRACT')
  }
  for(const [cue,vendor,status] of [
    ['Intel reference work','Intel','Reference work'],['recorded AMD runs','AMD','Recorded runs'],
    ['historical NVIDIA fleet evidence','NVIDIA','Historical fleet'],['Arm portability','Arm','Portability / qualification open'],
  ]){
    await inspect(page,timeline.beats.find(item=>item.cue===cue)!)
    const active=page.locator('.vendor-cartridges>div.active')
    await expect(active).toHaveCount(1)
    await expect(active.locator('strong')).toHaveText(vendor)
    await expect(active.locator('span')).toHaveText(status)
  }
  for(const [cue,stage] of [['Launchpad is central','Catalog'],['catalog intake','Provision'],['qualification checks','Qualify']]){
    await inspect(page,timeline.beats.find(item=>item.cue===cue)!)
    await expect(page.locator('.delivery-rail>div.active strong')).toHaveText(stage)
    await expect(page.locator('.cinema-source')).toContainText('Documented pilot')
  }
})

test('original logo, music, and intro assets load without competing audio', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'stage-1080p', 'Asset provenance checks are viewport independent.')
  const paths=['/brand/approved-main-reference.png','/brand/cognitive-overdrive-intro-v2.mp4','/music/theme-original.wav','/music/underscore-original.wav','/music/sting-original.wav','/narration/mixed/portfolio-master.mp3']
  for(const path of paths){
    const response=await request.get(path,{headers:{Range:'bytes=0-2047'}})
    expect(response.ok(),`${path} is delivered`).toBe(true)
    expect(response.headers()['content-type'],`${path} is media, not the SPA fallback`).not.toContain('text/html')
    expect((await response.body()).byteLength,`${path} has media bytes`).toBeGreaterThan(100)
  }
  await page.goto('/?film&inspect&at=5')
  // Native video has no implicit accessibility role in Chromium.
  const video=page.locator('video.original-intro')
  await expect(video).toHaveAttribute('src','/brand/cognitive-overdrive-intro-v2.mp4')
  await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
  expect(await video.evaluate(element=>(element as HTMLVideoElement).muted)).toBe(true)
  await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeCloseTo(5,1)
  expect(await page.locator('audio').evaluate(element=>(element as HTMLAudioElement).paused)).toBe(true)
  await inspect(page,timeline.beats[0])
  const logo=page.locator('.cinema-header img')
  await expect(logo).toHaveAttribute('src','/brand/approved-main-reference.png')
  expect(await logo.evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000)
})

test('real audio playback, pause, slider seek, and keyboard seek share one clock', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'laptop', 'Exercised with desktop and touch controls.')
  test.setTimeout(60_000)
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/?film')
  const audio=page.locator('audio')
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(1)
  expect(await audio.evaluate(element=>(element as HTMLAudioElement).duration)).toBeCloseTo(timeline.total,0)
  await page.locator('[data-start]').click()
  await expect(page.locator('.cinema')).toHaveAttribute('data-running','true')
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(.3)
  await page.getByRole('button',{name:'Pause film',exact:true}).click()
  await expect(page.locator('.cinema')).toHaveAttribute('data-running','false')
  expect(await audio.evaluate(element=>(element as HTMLAudioElement).paused)).toBe(true)
  const pausedAt=await audio.evaluate(element=>(element as HTMLAudioElement).currentTime)
  await page.waitForTimeout(350)
  expect(await audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeCloseTo(pausedAt,2)
  const slider=page.getByRole('slider',{name:'Film position'})
  await slider.focus();await slider.press('End')
  await expect(page.locator('.cinema')).toHaveAttribute('data-finished','true')
  await slider.press('Home');for(let i=0;i<10;i++)await slider.press('ArrowRight')
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeCloseTo(.1,2)
  // Focused slider increments are 0.01 seconds; background arrow seeks are 10.
  await page.locator('.cinema').click({position:{x:4,y:4}})
  for(let i=0;i<17;i++)await page.keyboard.press('ArrowRight')
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeCloseTo(170.1,1)
  expect(Number(await page.locator('.cinema').getAttribute('data-time'))).toBeCloseTo(170.1,1)
  await expect(page.locator('.flow-contract')).toContainText('SAME APPLICATION CONTRACT')
  await page.getByRole('button',{name:'Toggle film captions'}).click()
  await expect(page.locator('.cinema-caption')).toContainText('Praxis')
  await page.getByRole('button',{name:'Play film',exact:true}).click()
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(170.3)
  await page.getByRole('button',{name:'Pause film',exact:true}).click()
  await expect(page.locator('.cinema')).toHaveAttribute('data-running','false')
  expect(errors).toEqual([])
})


test('recorded demo clips follow explicit seeks and resume on the narration clock', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'laptop', 'Covered with desktop and touch controls.')
  test.setTimeout(60_000)
  const bakeoff=timeline.beats.find(beat=>beat.cue==='The Great CPU Bake Off')!
  const edge=timeline.beats.find(beat=>beat.cue==='Edge Inference at Scale')!
  const initial=bakeoff.at+1.5
  await page.goto(`/?film&at=${initial}`)
  const audio=page.locator('audio')
  const reel=page.locator('video.cinema-media')
  await expect.poll(()=>reel.evaluate(element=>(element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
  await page.locator('[data-start]').click()
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(initial+.15)
  await page.getByRole('button',{name:'Pause film',exact:true}).click()
  const beforeSeek=await reel.evaluate(element=>(element as HTMLVideoElement).currentTime)
  const slider=page.getByRole('slider',{name:'Film position'})
  await slider.focus()
  // Rewind half a second through the actual range control, staying in the same clip.
  for(let i=0;i<50;i++)await slider.press('ArrowLeft')
  const filmTime=Number(await page.locator('.cinema').getAttribute('data-time'))
  const duration=await reel.evaluate(element=>(element as HTMLVideoElement).duration)
  await expect.poll(()=>reel.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeCloseTo((filmTime-bakeoff.at)%duration,1)
  expect(await reel.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeLessThan(beforeSeek-.3)
  expect(await reel.evaluate(element=>(element as HTMLVideoElement).paused)).toBe(true)

  // A background seek crosses into another recorded clip while playback is paused.
  await page.locator('.cinema').click({position:{x:4,y:4}})
  await page.keyboard.press('ArrowRight')
  await expect(reel).toHaveAttribute('src','/showcase/edge.mp4')
  await expect.poll(()=>reel.evaluate(element=>(element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
  const edgeTime=Number(await page.locator('.cinema').getAttribute('data-time'))
  const edgeDuration=await reel.evaluate(element=>(element as HTMLVideoElement).duration)
  const edgePosition=(edgeTime-edge.at)%edgeDuration
  await expect.poll(()=>reel.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeCloseTo(edgePosition,1)
  expect(await reel.evaluate(element=>(element as HTMLVideoElement).paused)).toBe(true)
  await page.getByRole('button',{name:'Play film',exact:true}).click()
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(edgeTime+.2)
  await expect.poll(()=>reel.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeGreaterThan(edgePosition+.15)
  await page.getByRole('button',{name:'Pause film',exact:true}).click()
  const clocks=await page.evaluate(()=>({
    audio:document.querySelector('audio')!.currentTime,
    video:document.querySelector<HTMLVideoElement>('video.cinema-media')!.currentTime,
    paused:document.querySelector<HTMLVideoElement>('video.cinema-media')!.paused,
  }))
  expect(clocks.paused).toBe(true)
  expect(Math.abs(clocks.video-((clocks.audio-edge.at)%edgeDuration))).toBeLessThan(.25)
})

test('a soundtrack failure after starting stops playback and exposes recovery', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'laptop', 'Covered with desktop and touch controls.')
  await page.goto('/?film&at=20')
  const audio=page.locator('audio')
  await page.locator('[data-start]').click()
  await expect(page.locator('.cinema')).toHaveAttribute('data-running','true')
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).currentTime)).toBeGreaterThan(20.2)
  // A real browser media failure, after the start overlay has already gone away.
  await page.route('**/__cinema_failed_soundtrack__.mp3',route=>route.fulfill({status:404,contentType:'audio/mpeg',body:''}))
  await audio.evaluate(element=>{
    const media=element as HTMLAudioElement
    media.src='/__cinema_failed_soundtrack__.mp3'
    media.load()
  })
  await expect.poll(()=>audio.evaluate(element=>(element as HTMLAudioElement).error!==null)).toBe(true)
  await expect(page.locator('.cinema')).toHaveAttribute('data-running','false')
  await expect(page.getByRole('alert')).toHaveText('Soundtrack unavailable. Reload to try again.')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button',{name:'Play film',exact:true})).toBeVisible()
  expect(await audio.evaluate(element=>(element as HTMLAudioElement).paused)).toBe(true)
  if(testInfo.project.name==='stage-1080p')await expect(page.getByRole('link',{name:'Explore / try it ↗',exact:true})).toBeVisible()
})
