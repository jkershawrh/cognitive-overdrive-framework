import { expect, test, type Page } from '@playwright/test'
import { projects } from '../src/portfolio/projects'

const chapters = [
  ['possibility', 'COMPLEXITY.'], ['decision', 'ONE SYSTEM.'], ['work', 'IDEAS THAT'],
  ['architecture', 'EARN'], ['proof', 'PROOF NEEDS'], ['multiplier', 'BUILT ONCE.'], ['return', 'A STORY'],
]

async function checkViewport(page: Page, mobile: boolean) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }))
  expect(dimensions.scrollWidth, 'No horizontal page overflow').toBeLessThanOrEqual(dimensions.width + 1)
  if (!mobile) {
    expect(dimensions.scrollHeight, 'Desktop story fits the stage vertically').toBeLessThanOrEqual(dimensions.height + 1)
    await expect(page.getByRole('button', { name: 'Next chapter', exact: true })).toBeInViewport({ ratio: 1 })
  }
}

test('all seven chapters fit the stage and remain usable on mobile', async ({ page, isMobile }, testInfo) => {
  for (const [id, heading] of chapters) {
    await page.goto(`/?chapter=${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
    await page.evaluate(() => document.fonts.ready)
    await checkViewport(page, isMobile)
    if (!isMobile) {
      await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 })
      if (id === 'architecture') await expect(page.getByRole('button', { name: 'Reveal boundary' })).toBeInViewport({ ratio: 1 })
      if (id === 'proof') await expect(page.getByRole('button', { name: 'Run policy check' })).toBeInViewport({ ratio: 1 })
    }
    await testInfo.attach(`${id}-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: isMobile }), contentType: 'image/png' })
  }
})

test('architecture answers reveal sequentially and cite source at every boundary', async ({ page, isMobile }) => {
  await page.goto('/?chapter=architecture')
  const diagram = page.locator('.architecture-panel svg[role="img"]')
  const discoveries = [
    ['Frontend / API', 'Go orchestrator', 'Domain agents'],
    ['Frontend / API', 'Go orchestrator', 'Domain agents', 'Model serving', 'MCP gateway'],
    ['Frontend / API', 'Go orchestrator', 'Domain agents', 'Model serving', 'MCP gateway', 'Events + audit'],
  ]
  const allNodes = discoveries[2]
  const assertDiscovery = async (known: string[]) => {
    for (const label of allNodes) {
      const node = diagram.getByText(label, { exact: true })
      if (known.includes(label)) await expect(node).toBeVisible()
      else await expect(node, `${label} stays hidden until its answer is earned`).toHaveCount(0)
    }
  }
  await assertDiscovery(['Frontend / API'])
  for (const label of ['request', 'A2A', 'model API', 'MCP', 'events']) {
    await expect(diagram.getByText(label, { exact: true }), 'No unearned connection labels').toHaveCount(0)
  }
  for (const [index, answer] of ['Coordination ≠ inference', 'Reasoning ≠ deterministic lookup', 'An answer needs a record', 'A walkthrough ≠ a live run'].entries()) {
    await expect(page.getByRole('button', { name: index === 3 ? 'Restart questions' : 'Next question' })).toBeDisabled()
    await page.getByRole('button', { name: 'Reveal boundary' }).click()
    await expect(page.getByText(answer, { exact: true })).toBeVisible()
    await assertDiscovery(discoveries[Math.min(index, 2)])
    await expect(diagram.getByText('A2A', { exact: true })).toBeVisible()
    if (index >= 1) {
      await expect(diagram.getByText('model API', { exact: true })).toBeVisible()
      await expect(diagram.getByText('MCP', { exact: true })).toBeVisible()
    }
    if (index >= 2) await expect(diagram.getByText('events', { exact: true })).toBeVisible()
    await expect(page.locator('.architecture-answer a')).toHaveAttribute('href', /github\.com\/jkershawrh\/triforce\/blob\/[a-f0-9]{40}\//)
    if (!isMobile) await expect(page.locator('.architecture-answer')).toBeInViewport({ ratio: 1 })
    await checkViewport(page, isMobile)
    if (index === 1) {
      const navigation = page.getByRole('navigation', { name: 'Story chapters' })
      await navigation.getByRole('button', { name: /proof/i }).click()
      await expect(page.getByRole('heading', { level: 1 })).toContainText('PROOF NEEDS')
      await navigation.getByRole('button', { name: /architecture/i }).click()
      await expect(page.getByRole('heading', { name: 'Which work needs a model, and which needs a tool?' })).toBeVisible()
      await expect(page.getByText(answer, { exact: true })).toBeVisible()
      await assertDiscovery(discoveries[1])
      await expect(page.getByRole('button', { name: 'Boundary revealed' })).toBeDisabled()
    }
    await page.getByRole('button', { name: index === 3 ? 'Restart questions' : 'Next question' }).click()
    if (index < 3) await assertDiscovery(discoveries[Math.min(index, 2)])
  }
  await expect(page.getByRole('heading', { name: 'Who turns the request into coordinated work?' })).toBeVisible()
  await assertDiscovery(['Frontend / API'])
  await expect(diagram.getByText('A2A', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next question' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Question 2:/ })).toBeDisabled()
})

test('browser rehearsal produces and exports all three honest outcomes', async ({ page, isMobile }) => {
  await page.goto('/?chapter=proof')
  await expect(page.getByText('SIMULATION · runs in this browser')).toBeVisible()
  for (const [condition, outcome] of [['Complete evidence', 'Ready for review'], ['Missing evidence', 'Held for evidence'], ['Denied authority', 'Stopped at authority']]) {
    await page.getByRole('radio', { name: new RegExp(condition) }).check()
    await page.getByRole('button', { name: 'Run policy check' }).click()
    await expect(page.locator('.rehearsal-result')).toContainText(outcome)
    if (!isMobile) await expect(page.locator('.rehearsal-result')).toBeInViewport({ ratio: 1 })
  }
  await expect(page.getByRole('list', { name: 'Compare rehearsal records' }).getByRole('listitem')).toHaveCount(3)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('cognitive-overdrive-rehearsal.json')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  const artifact = JSON.parse(Buffer.concat(chunks).toString())
  expect(artifact.source).toBe('SIMULATION')
  expect(artifact.records.map((record: { decision: string }) => record.decision)).toEqual(['REVIEW_READY', 'EVIDENCE_REQUIRED', 'AUTHORITY_REQUIRED'])
  expect(artifact.records.every((record: { source: string; timestamp: string }) => record.source === 'SIMULATION' && Number.isFinite(Date.parse(record.timestamp)))).toBe(true)
  await page.getByRole('navigation', { name: 'Story chapters' }).getByRole('button', { name: /return/i }).click()
  await expect(page.getByText('3 simulated decisions')).toBeVisible()
})

test('project directory filters, opens a real case, and keeps its source', async ({ page }) => {
  const project = projects.find(item => item.source)
  expect(project, 'Portfolio contains a source-backed project').toBeDefined()
  await page.goto('/?chapter=work')
  await page.getByRole('button', { name: /All projects/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Search projects' }).fill('no-project-matches-this-string')
  await expect(dialog.getByText('No projects match this search.')).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Search projects' }).fill(project!.title)
  await dialog.getByRole('combobox', { name: 'Filter projects by discipline' }).selectOption(project!.category)
  const match = dialog.locator('.directory-list button').filter({ hasText: project!.title })
  await expect(match).toHaveCount(1)
  await match.click()
  await expect(dialog.getByRole('heading', { name: project!.title, exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Inspect the source' })).toHaveAttribute('href', project!.source!)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('deep links, browser back, and focused controls preserve navigation intent', async ({ page }) => {
  await page.goto('/?chapter=decision')
  await page.getByRole('tab', { name: /C-suite/ }).click()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/chapter=decision/)
  await page.locator('main').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/chapter=work/)
  await page.goBack()
  await expect(page.getByRole('tablist', { name: 'Audience perspective' })).toBeVisible()
  await page.getByRole('button', { name: 'Next chapter', exact: true }).click()
  await page.getByRole('button', { name: /All projects/ }).click()
  await page.getByRole('textbox', { name: 'Search projects' }).fill('pipeline')
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/chapter=work/)
  await page.keyboard.press('Escape')
  await page.locator('main').focus()
  await page.keyboard.press('Home')
  await expect(page).toHaveURL(/chapter=possibility/)
})

test('every chapter has its own delivered narration and readable transcript', async ({ page, request }) => {
  const response = await request.get('/narration/manifest.json')
  expect(response.ok(), 'Narration manifest has been delivered').toBe(true)
  const manifest = await response.json() as { tracks: { id: string; src: string; text: string }[] }
  expect(manifest.tracks).toHaveLength(7)
  for (const [index, [id]] of chapters.entries()) {
    const track = manifest.tracks.find(item => item.id.startsWith(String(index + 1).padStart(2, '0')))
    expect(track?.text.trim().length).toBeGreaterThan(50)
    const audioResponse = await request.get(track!.src)
    expect(audioResponse.ok(), `Audio exists for ${id}`).toBe(true)
    expect((await audioResponse.body()).byteLength).toBeGreaterThan(1000)
    await page.goto(`/?chapter=${id}`)
    await expect(page.getByRole('button', { name: 'Play narration' })).toBeEnabled()
    await page.getByRole('button', { name: 'Toggle transcript' }).click()
    await expect(page.locator('.transcript')).toContainText(track!.text)
    await expect(page.locator('audio')).toHaveAttribute('src', track!.src)
    await page.getByRole('button', { name: 'Close transcript' }).click()
  }
  await page.getByRole('button', { name: 'Play narration' }).click()
  await expect(page.getByRole('button', { name: 'Pause narration' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause narration' }).click()
  await expect(page.getByRole('button', { name: 'Play narration' })).toBeVisible()
})
