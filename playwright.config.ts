import { defineConfig, devices } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from './e2e/support/actors';

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
 * Where the demonstration member's signed-in session is kept, so the journeys
 * do not each spend a page load logging in. Other actors have their own files.
 */
export const SIGNED_IN_STATE = MEMBER_STORAGE_STATE;

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
      // Names the database, the actors and the capabilities. Does not purge
      // anybody's tracking data.
      name: 'preflight',
      testMatch: /support[\\/]preflight\.setup\.e2e\.ts/,
    },
    {
      // Signs in each actor. Still does not touch Custom Tracking.
      name: 'authenticate',
      testMatch: /support[\\/]sign-in\.setup\.e2e\.ts/,
      dependencies: ['preflight'],
    },
    {
      // Switches Custom Tracking on and clears the demonstration member.
      // Only the journeys depend on this, so another project can sign in
      // without purging that data.
      name: 'custom-tracking',
      testMatch: /support[\\/]custom-tracking\.setup\.e2e\.ts/,
      dependencies: ['authenticate'],
      teardown: 'teardown',
    },
    {
      // Clears this member's tracking data and switches the feature off.
      // There is no snapshot of what was there before the run: off is how
      // the feature is deployed, and anything the journeys built is purged.
      name: 'teardown',
      testMatch: /support[\\/]restore\.teardown\.e2e\.ts/,
    },
    {
      // Proves the fixtures reset between cases. Does not switch the feature on.
      name: 'infrastructure',
      testMatch: /infrastructure[\\/].*\.e2e\.ts/,
      dependencies: ['authenticate'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'journeys',
      testMatch: /(journeys|reviews)[\\/].*\.e2e\.ts/,
      dependencies: ['custom-tracking'],
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
