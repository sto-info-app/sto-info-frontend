import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  click,
  glide,
  openClip,
  pause,
  typeInto,
} from './support/clip';
import {
  confirmStandaloneFleet,
  placeInArmada,
  registerArmada,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Communities, Fleets and Armadas" guide, as a video
 * (13 October 2026): the three kinds of record, a Community's page listing
 * its Armadas and Fleets, an Armada's shape, a console Fleet with no roster
 * export, a shared name, a Fleet nobody here runs, and Visible to.
 *
 * The Owner builds the Community off camera. A visitor who is not signed in
 * records it, since anybody may browse the Fleet section.
 */

const COMMUNITY = 'Starfleet Reserve';
const ALPHA = 'Reserve Fleet Alpha';
const BETA = 'Reserve Fleet Beta';
const UNPLACED = 'Reserve Fleet Delta';
const CONSOLE = 'Reserve Fleet Xbox';
const ARMADA = 'Reserve Armada';
const KNOWN_AS = 'The Reserve';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Communities, Fleets and Armadas', async ({ as, browser }, info) => {
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const alphaPath = await registerFleet(owner, communityPath, COMMUNITY, ALPHA);
  const betaPath = await registerFleet(owner, communityPath, COMMUNITY, BETA);

  await registerFleet(owner, communityPath, COMMUNITY, UNPLACED);
  await registerFleet(owner, communityPath, COMMUNITY, CONSOLE, {
    platform: 'Xbox',
  });

  const armadaPath = await registerArmada(
    owner,
    communityPath,
    COMMUNITY,
    ARMADA,
    KNOWN_AS,
  );

  await placeInArmada(owner, alphaPath, ALPHA, armadaPath, ARMADA, 'Alpha');
  await placeInArmada(owner, betaPath, BETA, armadaPath, ARMADA, 'Beta');

  // Another record of the Alpha's name, kept by nobody.
  await confirmStandaloneFleet(owner, ALPHA);

  const clip = await openClip(browser, info, null);
  const { page } = clip;
  const tabs = page.getByRole('navigation', { name: 'Fleet sections' });

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The three kinds of record.
    await page.goto('/fleets');
    await expect(
      page.getByRole('heading', { name: 'Fleet Directory' }),
    ).toBeVisible();
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Three kinds of record: a Community, a Fleet and an Armada',
    );
    await pause(page, 3_500);

    // A Community and what it holds.
    await click(page, tabs.getByRole('link', { name: 'Communities' }));
    await caption(
      page,
      'A Community is this site’s umbrella: it holds the Fleets and Armadas you register',
    );
    await pause(page, 3_000);
    await click(page, page.getByRole('link', { name: COMMUNITY }).first());
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    await caption(
      page,
      'A Community has no platform of its own, so it can hold Fleets on several',
    );
    await pause(page, 3_000);

    const structure = page.locator('.community-structure');

    await glide(page, structure.getByText('Armadas and Fleets').first());
    await caption(
      page,
      'Armadas and Fleets: each Armada with the Fleets placed in it, then Fleets not in an Armada',
    );
    await pause(page, 2_000);
    await glide(page, structure.getByText('Fleets not in an Armada').first());
    await pause(page, 3_000);

    // An Armada's shape.
    await click(page, structure.getByRole('link', { name: ARMADA }).first());
    await expect(page).toHaveURL(/\/armadas\/[^/]+\/[^/]+$/);
    await caption(
      page,
      'An Armada allies Fleets of one Community: one Alpha, up to three Betas, three Gammas under each',
    );
    await glide(page, page.getByText('Fleets in this Armada').first());
    await pause(page, 4_000);
    await glide(page, page.getByText(/Known as/).first());
    await caption(
      page,
      'An Armada may also carry a friendlier name, shown as Known as',
    );
    await pause(page, 3_000);

    // Platforms.
    await caption(
      page,
      'Every Fleet and Armada is on one platform. One name on two platforms is two Fleets',
    );
    await click(page, page.locator('.fleet-scope-card__community a').first());
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    await click(page, structure.getByRole('link', { name: CONSOLE }).first());
    await expect(page).toHaveURL(/\/fleets\/[^/]+\/[^/]+$/);
    await caption(
      page,
      'A console Fleet: the game provides no roster export there, so no roster pages are offered',
    );
    await glide(page, page.getByText(/no roster export/).first());
    await pause(page, 4_000);

    // A shared name. The directory is loaded afresh, which takes the caption
    // bar with it, so the caption follows.
    await page.goto('/fleets');
    await caption(
      page,
      'Two Communities may each keep a record of one in-game Fleet',
    );
    await typeInto(page, page.getByLabel('Fleet name'), ALPHA);
    await click(page, page.getByRole('button', { name: 'Search' }));
    await glide(
      page,
      page.getByText('1 other record answers to this name on Windows').first(),
    );
    await caption(
      page,
      'A card says when its name is shared. Nobody’s record is the authoritative one',
    );
    await pause(page, 4_000);

    // A Fleet nobody here runs.
    const standalone = page
      .locator('.fleet-scope-card')
      .filter({ hasText: ALPHA })
      .filter({ hasNot: page.locator('.fleet-scope-card__community') })
      .first();

    await caption(
      page,
      'A Fleet can also be recorded with no Community, as a Fleet nobody here runs',
    );
    await click(page, standalone.getByRole('link', { name: 'View Fleet' }));
    await expect(page).toHaveURL(/\/standalone\//);
    await glide(
      page,
      page.getByText('Following starts when a Community registers this Fleet.'),
    );
    await caption(
      page,
      'It has no owner, so nobody can change or close it, and there is no Community to follow',
    );
    await pause(page, 4_000);

    // Visible to.
    await glide(page, page.getByText('Visible to', { exact: true }).first());
    await caption(
      page,
      'Visible to says who may see a record, from Anyone down to Only me',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-01-communities-fleets-and-armadas')}`,
    );
  }
});
