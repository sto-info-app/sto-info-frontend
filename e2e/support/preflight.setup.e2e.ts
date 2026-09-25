import { test as setup } from '@playwright/test';

import { writeManifest } from './manifest';

/**
 * Runs before anybody signs in.
 *
 * Custom Tracking is not touched here. An anonymous check, or a sign-in,
 * must not purge a member's tracking data on the way past.
 */

setup('record the isolated environment', async ({ browser }) => {
  await writeManifest(browser.version());
});
