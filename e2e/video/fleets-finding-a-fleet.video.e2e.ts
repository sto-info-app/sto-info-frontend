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
import {
  registerArmada,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Finding a Fleet" guide, as a video (13 October
 * 2026): the three directories, a search, the filters, reading a card, a
 * record's page, following its Community, and Communities You Follow.
 *
 * The Owner first puts a Community, two Fleets and an Armada in the
 * directory off camera, so the stranger who records it has something to
 * find beside the seeded fixtures.
 */

const COMMUNITY = 'Starfleet Reserve';
const OPEN_FLEET = 'Reserve Fleet Alpha';
const INVITATION_FLEET = 'Reserve Fleet Beta';
const ARMADA = 'Reserve Armada';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Finding a Fleet', async ({ as, browser }, info) => {
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);

  await registerFleet(owner, communityPath, COMMUNITY, OPEN_FLEET, {
    recruitment: 'Anyone eligible may join',
  });
  await registerFleet(owner, communityPath, COMMUNITY, INVITATION_FLEET, {
    recruitment: 'By invitation only',
  });
  await registerArmada(owner, communityPath, COMMUNITY, ARMADA);
  await readNotices(await as('stranger'));

  const clip = await openClip(browser, info, 'stranger');
  const { page } = clip;
  const tabs = page.getByRole('navigation', { name: 'Fleet sections' });

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The three directories.
    await page.goto('/fleets');
    await expect(
      page.getByRole('heading', { name: 'Fleet Directory' }),
    ).toBeVisible();
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'The Fleet Directory: Fleets, Communities and Armadas, a tab each',
    );
    await pause(page, 3_500);

    await click(page, tabs.getByRole('link', { name: 'Communities' }));
    await caption(
      page,
      'A Community holds the Fleets and Armadas registered here',
    );
    await pause(page, 3_000);

    await click(page, tabs.getByRole('link', { name: 'Armadas' }));
    await caption(page, 'An Armada allies some of one Community’s Fleets');
    await pause(page, 3_000);

    await click(page, tabs.getByRole('link', { name: 'Fleets', exact: true }));
    await pause(page, 1_500);

    // A search.
    await caption(page, 'Type part of a name and choose Search');
    await typeInto(page, page.getByLabel('Fleet name'), 'Reserve');
    await click(page, page.getByRole('button', { name: 'Search' }));
    await expect(
      page.getByRole('link', { name: OPEN_FLEET }).first(),
    ).toBeVisible();
    await caption(
      page,
      'Every name containing what you typed, capitals ignored',
    );
    await pause(page, 3_000);

    // The filters.
    await caption(
      page,
      'The other controls change the list as soon as you pick',
    );
    await choose(page, page.getByLabel('Showing'), 'Every record');
    await choose(page, page.getByLabel('Ordered by'), 'Newest first');
    await choose(page, page.getByLabel('Platform'), 'Windows');
    await choose(page, page.getByLabel('Roster'), 'Never imported');
    await pause(page, 1_500);
    await caption(page, 'Clear all puts everything back as it started');
    await click(page, page.getByRole('button', { name: 'Clear all' }));
    await pause(page, 2_500);

    // Reading a card, found again by name: the whole directory may run to
    // several pages, and the card to read is not promised a place on the
    // first.
    await caption(page, 'Search again to narrow the list');
    await typeInto(page, page.getByLabel('Fleet name'), 'Reserve');
    await click(page, page.getByRole('button', { name: 'Search' }));

    const card = page
      .locator('.fleet-scope-card')
      .filter({ hasText: OPEN_FLEET })
      .first();

    await expect(card).toBeVisible();
    await caption(
      page,
      'A card: the name, its emblem, then Platform, Status, Roster and Community',
    );
    await glide(page, card);
    await pause(page, 4_000);

    // The record's page.
    await caption(page, 'The eye opens the record');
    await click(page, card.getByRole('link', { name: 'View Fleet' }));
    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    await page.mouse.move(960, 500, { steps: 10 });
    await caption(
      page,
      'Its page says who may see it and when its roster was last imported',
    );
    await pause(page, 4_000);

    // Following its Community.
    await click(page, page.locator('.fleet-scope-card__community a').first());
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    await caption(
      page,
      'Follow this Community to see what it publishes to its followers',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Follow this Community' }),
    );
    await expect(
      page.getByRole('button', { name: 'Stop following' }),
    ).toBeVisible();
    await caption(
      page,
      'Stop following undoes it. Following is not a membership',
    );
    await pause(page, 3_500);

    // Communities You Follow.
    await page.goto('/dashboard/fleets');
    await expect(
      page.getByRole('link', { name: COMMUNITY }).first(),
    ).toBeVisible();
    await page.mouse.move(960, 500, { steps: 10 });
    await caption(
      page,
      'Communities You Follow, on your Dashboard, gathers them',
    );
    await pause(page, 3_000);
    await glide(page, page.getByRole('link', { name: 'Open chat' }));
    await caption(
      page,
      'Also here: chat, your upcoming events and your Fleet activity',
    );
    await pause(page, 2_000);
    await glide(
      page,
      page.getByText('Your upcoming events', { exact: true }).first(),
    );
    await pause(page, 2_000);
    await glide(
      page,
      page.getByText('Your Fleet activity', { exact: true }).first(),
    );
    await pause(page, 3_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-02-finding-a-fleet')}`);
  }
});
