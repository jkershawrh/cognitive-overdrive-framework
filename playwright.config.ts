import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './visual-tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5177', url: 'http://127.0.0.1:5177', reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:5177', colorScheme: 'light', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'stage-1080p', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'laptop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'rehearsal-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
