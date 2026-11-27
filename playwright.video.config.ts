import { defineConfig, devices } from '@playwright/test';

import testConfig, { FLEET_PEOPLE_PROJECTS } from './playwright.config';

/**
 * The help videos (13 October 2026): one clip per guide, recorded at 1920 by
 * 1080 for YouTube by e2e/video, with the people fleet-setup makes. They are
 * for internal generation and test nothing, so they live in this config
 * rather than playwright.config.ts, and `npm run e2e` can never run them.
 * `npm run e2e:video` does.
 *
 * Everything else (the dev server, the base URL, the single worker, the
 * timeouts) is the test config's, so a clip sees the same site a journey
 * does. Reports and artefacts go to folders of their own, so a recording run
 * never overwrites the last test run's report.
 */
export default defineConfig({
  ...testConfig,
  testIgnore: [],

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright/video-html', open: 'never' }],
  ],
  outputDir: 'reports/playwright/video-artifacts',

  projects: [
    ...FLEET_PEOPLE_PROJECTS,
    // No retries, no trace and a long clock, since a clip is paced for a
    // viewer rather than a runner. Motion is left on, unlike the journeys,
    // because the folds and transitions are what a viewer sees. Each clip
    // opens its own context, which is where the recording is switched on; see
    // e2e/video/support/clip.ts.
    {
      name: 'video',
      testMatch: /video[\\/].*\.e2e\.ts/,
      dependencies: ['fleet-setup'],
      retries: 0,
      timeout: 900_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
        trace: 'off',
        launchOptions: { slowMo: 150 },
      },
    },
  ],
});
