import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { story } from './portfolio/story'

const manifest = { tracks: story.chapters.map(chapter => ({ id: chapter.narration, text: `Transcript for ${chapter.title}.`, src: `/narration/${chapter.narration}.mp3` })) }

describe('Cognitive Overdrive portfolio navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => manifest }))
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn().mockResolvedValue(undefined) })
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('opens the portfolio and exposes all seven story chapters', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('COMPLEXITY.MEET CLARITY.')
    expect(within(screen.getByRole('navigation', { name: 'Story chapters' })).getAllByRole('button')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Enter the journey' }))
    expect(new URLSearchParams(window.location.search).get('chapter')).toBe('decision')
    await screen.findByRole('tablist', { name: 'Audience perspective' })
  })

  it('restores a deep link and follows browser history state', async () => {
    window.history.replaceState(null, '', '/?chapter=proof')
    render(<App />)
    expect(screen.getByText('SIMULATION · runs in this browser')).toBeInTheDocument()
    act(() => {
      window.history.replaceState(null, '', '/?chapter=decision')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await screen.findByRole('tablist', { name: 'Audience perspective' })
    expect(screen.queryByRole('button', { name: 'Run policy check' })).not.toBeInTheDocument()
  })

  it('uses a safe first chapter for unknown deep links', () => {
    window.history.replaceState(null, '', '/?chapter=does-not-exist')
    render(<App />)
    expect(screen.getByRole('button', { name: 'Enter the journey' })).toBeInTheDocument()
  })

  it('advances on background keyboard input but leaves focused controls alone', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await screen.findByRole('tablist', { name: 'Audience perspective' })
    const tab = screen.getByRole('tab', { name: /C-suite/ })
    fireEvent.keyDown(tab, { key: 'ArrowRight' })
    expect(new URLSearchParams(window.location.search).get('chapter')).toBe('decision')
    fireEvent.keyDown(window, { key: 'Home' })
    await screen.findByRole('button', { name: 'Enter the journey' })
  })

  it('updates audience emphasis without changing chapters', async () => {
    window.history.replaceState(null, '', '/?chapter=decision')
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /C-suite/ }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('What becomes possible—and what would it take?')
    fireEvent.click(screen.getByRole('tab', { name: /Internal teams/ }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Can someone else take this forward without starting over?')
    expect(new URLSearchParams(window.location.search).get('chapter')).toBe('decision')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play narration' })).toBeEnabled())
  })

  it('keeps the directory and chapter stable while editing a search', async () => {
    window.history.replaceState(null, '', '/?chapter=work')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /All projects/ }))
    const search = screen.getByRole('textbox', { name: 'Search projects' })
    fireEvent.change(search, { target: { value: 'no-project-matches-this-string' } })
    fireEvent.keyDown(search, { key: 'ArrowRight' })
    expect(screen.getByText('No projects match this search.')).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('chapter')).toBe('work')
    fireEvent.click(screen.getByRole('button', { name: 'Close project details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play narration' })).toBeEnabled())
  })

  it('requires revealing the architecture answer before advancing', () => {
    window.history.replaceState(null, '', '/?chapter=architecture')
    render(<App />)
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal boundary' }))
    expect(screen.getByText('Coordination ≠ inference')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Which work needs a model, and which needs a tool?' })).toBeInTheDocument()
  })

  it('retains all three simulated observations on the return chapter', async () => {
    window.history.replaceState(null, '', '/?chapter=proof')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Run policy check' }))
    fireEvent.click(screen.getByRole('radio', { name: /Missing evidence/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Run policy check' }))
    fireEvent.click(screen.getByRole('radio', { name: /Denied authority/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Run policy check' }))
    expect(within(screen.getByRole('list', { name: 'Compare rehearsal records' })).getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Story chapters' })).getByRole('button', { name: /return/i }))
    await screen.findByText('3 simulated decisions')
  })

  it('changes the transcript and audio source with the chapter', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play narration' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Toggle transcript' }))
    expect(screen.getByText('Transcript for The possibility.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play narration' }))
    await screen.findByRole('button', { name: 'Pause narration' })
    fireEvent.click(screen.getByRole('button', { name: 'Next chapter' }))
    await screen.findByText('Transcript for The decision.')
    expect(document.querySelector('audio')).toHaveAttribute('src', '/narration/02-decision.mp3')
    expect(screen.getByRole('button', { name: 'Play narration' })).toBeInTheDocument()
  })

  it('keeps the transcript available after playback fails', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Playback blocked'))
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play narration' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Play narration' }))
    expect(await screen.findByText('Audio could not play. Read the transcript below.')).toBeInTheDocument()
    expect(screen.getByText('Transcript for The possibility.')).toBeInTheDocument()
  })
})
