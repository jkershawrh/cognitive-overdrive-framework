import '@testing-library/jest-dom/vitest'

import {beforeEach,vi} from 'vitest'
// jsdom has no layout or raster canvas. Real rendering is verified in Playwright.
beforeEach(()=>vi.stubGlobal('ResizeObserver',class { observe(){} unobserve(){} disconnect(){} }))
HTMLCanvasElement.prototype.getContext=vi.fn().mockReturnValue(null)
