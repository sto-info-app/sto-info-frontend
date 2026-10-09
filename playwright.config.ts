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

  reporter: process.env['CI']
    ? [
        ['list'],
        ['html', { outputFolder: 'reports/playwright/html', open: 'never' }],
        ['junit', { outputFile: 'reports/playwright/junit.xml' }],
        ['json', { outputFile: 'reports/playwright/results.json' }],
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'reports/playwright/html', open: 'never' }],
      ],

  outputDir: 'reports/playwright/artifacts',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // A control that never becomes clickable should fail here, not consume
    // the whole test. A document that never finishes loading should too.
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
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
      // Frequent cases. They sign in through the authenticate project and do
      // not switch Custom Tracking on, so they neither purge it nor require it.
      name: 'frequent',
      testMatch: /frequent[\\/].*\.e2e\.ts/,
      dependencies: ['authenticate'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Weekly cases. They do not purge Custom Tracking. Storytime is switched
      // on only by the cases that read it.
      name: 'weekly',
      testMatch: /weekly[\\/].*\.e2e\.ts/,
      dependencies: ['authenticate'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Storytime is off for this case, and only this case. The next project
      // is what switches it on.
      name: 'storytime-off',
      testMatch: /storytime[\\/]offline\.e2e\.ts/,
      dependencies: ['authenticate'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Switches Storytime on and publishes the voyage the on-cases read.
      name: 'storytime-prepare',
      testMatch: /storytime[\\/]prepare\.setup\.e2e\.ts/,
      dependencies: ['storytime-off'],
      teardown: 'storytime-finish',
    },
    {
      // Removes the voyage and switches Storytime off again.
      name: 'storytime-finish',
      testMatch: /storytime[\\/]finish\.teardown\.e2e\.ts/,
    },
    {
      name: 'storytime',
      testMatch: /storytime[\\/]stories\.e2e\.ts/,
      dependencies: ['storytime-prepare'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Mail and picture cases. Weekly does not depend on this project, so it
      // stays green when the picture flag is unset. The picture journey lives
      // here rather than in journeys, so a full run does not upload it twice.
      name: 'external',
      testMatch: [
        /external[\\/].*\.e2e\.ts/,
        /journeys[\\/]04-pictures\.e2e\.ts/,
      ],
      dependencies: ['custom-tracking'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: SIGNED_IN_STATE,
      },
    },
    {
      name: 'journeys',
      testMatch: /(journeys|reviews)[\\/](?!04-pictures).*\.e2e\.ts/,
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
