import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end journeys drive a real browser against a real backend and a
 * real database. They are deliberately not mocked: the questions they answer —
 * does a value recorded against one account stay off another, does a deleted
 * option still read correctly, does public content actually disappear when an
 * account is disabled — are all questions about what the server does, and a
 * stub of the server would only ever answer them the way it was written to.
 *
 * That makes them slower and more demanding than the unit suites, so they are
 * kept apart: `npm test` never runs them, and they have prerequisites of their
 * own (see e2e/README.md).
 */

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

/**
 * Where the signed-in session is kept between the sign-in step and the
 * journeys, so that ten journeys do not each spend a page load logging in.
 */
export const SIGNED_IN_STATE = 'reports/playwright/.signed-in.json';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',

  // One member's data is the subject of every journey, and several of them
  // delete or hide parts of it. Run in parallel and they would be editing each
  // other's hierarchy.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,

  // A journey builds a hierarchy through the interface a click at a time, and
  // each click is a round trip to a real server.
  timeout: 180_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright/html', open: 'never' }],
  ],

  outputDir: 'reports/playwright/artifacts',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      // Switches the feature on, clears anything a previous run left behind,
      // and signs in once.
      name: 'setup',
      testMatch: /support[\\/]sign-in\.setup\.e2e\.ts/,
      teardown: 'teardown',
    },
    {
      // Puts the flag and the member's data back as they were found.
      name: 'teardown',
      testMatch: /support[\\/]restore\.teardown\.e2e\.ts/,
    },
    {
      name: 'journeys',
      testMatch: /(journeys|reviews)[\\/].*\.e2e\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: SIGNED_IN_STATE,
      },
    },
  ],

  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
