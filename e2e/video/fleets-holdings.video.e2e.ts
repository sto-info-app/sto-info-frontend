import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  choose,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import { registerCommunity, registerFleet } from './support/prepare';

/**
 * The Fleets section's "Fleet holdings" guide, as a video (13 October
 * 2026): the Holdings tab, a tier recorded for the Fleet Starbase, and the
 * History beneath.
 *
 * Off camera the Owner registers the Community and a Fleet. The Owner
 * records.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Fleet holdings', async ({ as, browser }, info) => {
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The tab.
    await page.goto(fleetPath);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Every Fleet a Community holds has a Holdings tab, on every platform',
    );
    await click(
      page,
      page.getByRole('link', { name: 'Holdings', exact: true }).first(),
    );
    await expect(page).toHaveURL(/\/holdings$/);
    await caption(
      page,
      'Each holding, from the Fleet Starbase to the Fleet Colony World, track by track',
    );
    await pause(page, 4_000);

    const starbase = page.getByRole('region', {
      name: 'Fleet Starbase',
      exact: true,
    });

    await glide(page, starbase.getByRole('button', { name: 'Record…' }));
    await caption(
      page,
      'A tier out of its highest, with when it was last recorded. Nothing is read from the game',
    );
    await pause(page, 3_500);

    // Recording.
    await caption(
      page,
      'Record… under the holding, then choose the tier for each track that changed',
    );
    await click(page, starbase.getByRole('button', { name: 'Record…' }));

    const form = page.getByRole('form', { name: 'Record the Fleet Starbase' });

    await choose(page, form.getByLabel('Starbase', { exact: true }), 'Tier 3');
    await choose(page, form.getByRole('combobox').nth(1), 'Tier 2');
    await typeInto(
      page,
      form.getByLabel('Why (optional)'),
      'Upgrade project finished this week.',
    );
    await caption(
      page,
      'Record stays greyed out until a tier changes, and only the tracks you changed are recorded',
    );
    await click(
      page,
      form.getByRole('button', { name: 'Record', exact: true }),
    );
    await expect(
      page.getByText('Fleet Starbase recorded.', { exact: true }),
    ).toBeVisible();
    await pause(page, 3_000);
    await caption(
      page,
      'A tier can go down as well as up, to put a mistake right',
    );
    await pause(page, 3_000);

    // The history.
    await glide(page, page.getByText('History', { exact: true }).first());
    await caption(
      page,
      'History lists every save, newest first, with the reason. A correction is a new save',
    );
    await glide(page, page.locator('.fleet-holdings__change').first());
    await pause(page, 4_000);
    await caption(
      page,
      'Holdings are public. Who recorded a change is shown to members and recorders only',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-08-holdings')}`);
  }
});
