import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'development-only-android-emulation', use: { ...devices['Pixel 7'] } },
    { name: 'development-only-iphone-emulation', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    cwd: '../..',
    url: 'http://127.0.0.1:3100/healthz',
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3100', NODE_ENV: 'test', ALLOWED_ORIGINS: 'http://127.0.0.1:3100', TEST_GAME_SECONDS: '2',
      CREATE_LIMIT_PER_MINUTE: '1000', JOIN_LIMIT_PER_MINUTE: '1000', PREVIEW_LIMIT_PER_MINUTE: '1000',
      MAX_ROOMS: '500', MAX_TOTAL_PARTICIPANTS: '2000',
    },
  },
});
