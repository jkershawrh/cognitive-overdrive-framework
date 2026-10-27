import { readFile, access } from 'node:fs/promises'
import { resolve, dirname, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const entry = resolve(root, process.argv[2] ?? 'src/demo.config.ts')
const modules = new Map()
const loading = new Set()

// Evaluate only the local data modules that make up a story package.
// Type-only imports disappear during transpilation; UI components stay outside it.
async function dataModule(path) {
  if (modules.has(path)) return modules.get(path)
  if (loading.has(path)) throw new Error('Cyclic story data import: ' + relative(root, path))
  if (relative(root, path).startsWith('..')) throw new Error('Story imports must stay inside this repository.')
  loading.add(path)
  const source = await readFile(path, 'utf8')
  let code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const imports = [...code.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)]
  for (const match of imports.reverse()) {
    const specifier = match[1]
    if (!specifier.startsWith('.')) throw new Error('Story data must use local imports only: ' + specifier)
    const candidate = resolve(dirname(path), specifier)
    const dependency = extname(candidate) ? candidate : candidate + '.ts'
    const url = await dataModule(dependency)
    const start = match.index + match[0].indexOf(specifier)
    code = code.slice(0, start) + url + code.slice(start + specifier.length)
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  modules.set(path, url)
  loading.delete(path)
  return url
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function text(value, at) {
  assert(typeof value === 'string' && value.trim().length > 0, at + ' must be a nonempty string.')
}
function unique(values, at) {
  assert(new Set(values).size === values.length, at + ' must be unique.')
}
function publicUrl(value, at) {
  text(value, at)
  const url = new URL(value)
  assert(url.protocol === 'https:' && !url.username && !url.password, at + ' must be an HTTPS URL without credentials.')
  assert(!/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname), at + ' must not point to a private host.')
}
const imported = await import(await dataModule(entry))
const story = imported.demoConfig ?? imported.story ?? imported.default
assert(story && typeof story === 'object', 'Export a StoryPackage as demoConfig, story or default.')
for (const key of ['id', 'title', 'author', 'role', 'statement']) text(story[key], key)
publicUrl(story.contactUrl, 'contactUrl')
assert(Array.isArray(story.chapters) && story.chapters.length === 7, 'The default hero-journey package must contain seven chapters.')
assert(Array.isArray(story.projects) && story.projects.length > 0, 'Add at least one project.')
assert(Array.isArray(story.audiences) && story.audiences.length === 4, 'The default package requires four audience lenses.')
unique(story.chapters.map(item => item.id), 'Chapter IDs')
unique(story.chapters.map(item => item.narration), 'Narration IDs')
unique(story.projects.map(item => item.id), 'Project IDs')
unique(story.audiences.map(item => item.id), 'Audience IDs')
const categories = new Set(['Applied AI', 'Platforms', 'Enablement', 'Governance', 'Research'])
const projectIds = new Set(story.projects.map(item => item.id))
const audienceIds = new Set(['executive', 'architect', 'sales', 'internal'])
for (const chapter of story.chapters) {
  for (const key of ['id', 'title', 'myth', 'label', 'note', 'narration']) text(chapter[key], 'Chapter ' + chapter.id + '.' + key)
}
for (const project of story.projects) {
  for (const key of ['id', 'title', 'category', 'kicker', 'summary', 'audience', 'built', 'workflow', 'consumed', 'reuse', 'maturity']) text(project[key], 'Project ' + project.id + '.' + key)
  assert(categories.has(project.category), 'Unknown project category: ' + project.category)
  assert(/^#[a-f0-9]{6}$/i.test(project.accent), 'Use a six-digit hex accent for ' + project.id)
  assert(Array.isArray(project.tags) && project.tags.length > 0, 'Add searchable tags to ' + project.id)
  project.tags.forEach(tag => text(tag, project.id + '.tags'))
  if (project.source !== undefined) publicUrl(project.source, project.id + '.source')
}
for (const audience of story.audiences) {
  assert(audienceIds.has(audience.id), 'Unknown audience ID: ' + audience.id)
  for (const key of ['name', 'role', 'question', 'promise', 'deliverable']) text(audience[key], audience.id + '.' + key)
  assert(Array.isArray(audience.projectIds) && audience.projectIds.length > 0, 'Add cases to ' + audience.id)
  for (const id of audience.projectIds) assert(projectIds.has(id), audience.id + ' references missing project ' + id)
}
const serialized = JSON.stringify(story)
assert(!/\/Users\/|\/home\/|apps\.arena|\.kube\//.test(serialized), 'Story data contains local infrastructure provenance; keep it outside shipped content.')
const manifestPath = resolve(root, 'public/narration/manifest.json')
try {
  await access(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert(Array.isArray(manifest.tracks), 'Narration manifest must contain tracks.')
  unique(manifest.tracks.map(track => track.id), 'Manifest track IDs')
  for (const chapter of story.chapters) {
    const track = manifest.tracks.find(item => item.id === chapter.narration)
    assert(track, 'No narration track for chapter ' + chapter.id)
    text(track.text, 'Narration transcript for ' + chapter.id)
    assert(typeof track.src === 'string' && track.src.startsWith('/') && !track.src.startsWith('//') && !track.src.includes('..'), 'Narration audio must use a local public asset.')
    await access(resolve(root, 'public', track.src.slice(1)))
  }
} catch (error) {
  if (error.code === 'ENOENT' && error.path === manifestPath) {
    console.log('Narration manifest not present; voice asset validation skipped.')
  } else {
    throw error
  }
}
console.log('Story validated: ' + story.chapters.length + ' chapters, ' + story.audiences.length + ' lenses, ' + story.projects.length + ' projects.')
