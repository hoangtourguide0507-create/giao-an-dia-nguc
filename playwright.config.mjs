import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/app',
  fullyParallel: true,
  workers: process.env.CI ? 2 : '50%',
  retries: 0,
  /* có coverage thì app chậm hơn ~2,3 lần: nới giới hạn để máy bận không làm test rớt oan */
  timeout: process.env.NO_COVERAGE ? 30_000 : 60_000,
  reporter: [['list']],
  globalSetup: './tests/helpers/global-setup.mjs',
  globalTeardown: './tests/helpers/global-teardown.mjs',
  use: {
    baseURL: `http://localhost:${process.env.PORT || 4173}`,
    ...devices['iPhone 13'],
    browserName: 'chromium',
    defaultBrowserType: 'chromium',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure'
  },
  webServer: { command: 'node scripts/serve.mjs', url: `http://localhost:${process.env.PORT || 4173}/index.html`, reuseExistingServer: !process.env.CI }
});
