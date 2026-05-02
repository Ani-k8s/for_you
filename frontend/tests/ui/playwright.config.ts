import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const targetHost = baseURL.includes('localhost') || baseURL.includes('127.0.0.1') ? '127.0.0.1' : 'frontend';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            // Overrides DNS to point all .foryou requests to the appropriate target
            `--host-resolver-rules=MAP *.foryou ${targetHost}`
          ]
        }
      },
    },
  ],
});
