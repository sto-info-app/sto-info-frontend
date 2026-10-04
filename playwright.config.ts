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
    // Public pages, seen by a stranger: no sign-in, so no seed password.
    {
      name: 'public',
      testMatch: /public[\\/].*\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'] },
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
    // FC-044: the Fleet journeys, as people made for the run and removed after
    // it, so no seed password is needed (see e2e/README.md). Desktop first,
    // then the same journeys on a phone, each on its own Communities.
    // ---
    // One retry each: the local dev server now and then refuses a single
    // script on a fresh page's first burst, which leaves the page blank. A
    // test that passes only on its retry is still reported as flaky.
    {
      name: 'fleet-setup',
      testMatch: /support[\\/]fleet\.setup\.e2e\.ts/,
      teardown: 'fleet-teardown',
      retries: 1,
    },
    {
      name: 'fleet-teardown',
      testMatch: /support[\\/]fleet\.teardown\.e2e\.ts/,
    },
    {
      name: 'fleet-desktop',
      testMatch: /fleet[\\/].*\.e2e\.ts/,
      dependencies: ['fleet-setup'],
      retries: 1,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'fleet-mobile',
      testMatch: /fleet[\\/].*\.e2e\.ts/,
      dependencies: ['fleet-desktop'],
      retries: 1,
      use: { ...devices['Pixel 7'] },
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
