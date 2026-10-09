import { test as setup } from '@playwright/test';

import { storageStateFor } from './actors';
import { signIn } from './login';
import { readManifest } from './manifest';
import { member } from './member';

/**
 * Signs in once per actor and keeps each session apart.
 *
 * This does not switch Custom Tracking on. Journeys that need the feature
 * depend on that setup separately, so a project that only needs a session
 * does not purge anybody's tracking data.
 */

setup('sign in each actor', async ({ browser }) => {
  const manifest = readManifest();

  if (manifest.demo.email.toLowerCase() !== member.email.toLowerCase()) {
    throw new Error(
      'The manifest member is not the member this run signs in as.',
    );
  }

  const actors = [
    { code: 'M', email: member.email },
    ...manifest.actors.map(actor => ({
      code: actor.code,
      email: actor.email,
    })),
  ];

  for (const actor of actors) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await signIn(page, actor.email, member.password);
      await context.storageState({ path: storageStateFor(actor.code) });
    } finally {
      await context.close();
    }
  }
});
