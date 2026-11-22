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
  replaceInto,
  typeInto,
} from './support/clip';
import { BANNER, PICTURE, confirmStandaloneFleet } from './support/prepare';

/**
 * The Fleets section's "Registering a Community, Fleet or Armada" guide, as
 * a video (13 October 2026): a Community registered, then a Fleet whose name
 * is already taken, then an Armada with a friendlier name; an emblem and a
 * banner; and the Community renamed under Settings.
 *
 * Somebody else has already confirmed a Fleet of the same name nobody here
 * runs, off camera, so that "Check for existing records" has something to
 * say. The Owner records the rest.
 */

const COMMUNITY = 'Starfleet Reserve';
const RENAMED = 'Starfleet Reserve Command';
const FLEET = 'Reserve Fleet Alpha';
const ARMADA = 'Reserve Armada';
const KNOWN_AS = 'The Reserve';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Registering a Community, Fleet or Armada', async ({
  as,
  browser,
}, info) => {
  await confirmStandaloneFleet(await as('stranger'), FLEET);

  const owner = await as('owner');

  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // A Community.
    await page.goto('/fleets/communities');
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Register a Community, on the Communities tab: your umbrella comes first',
    );
    await pause(page, 2_500);
    await click(page, page.getByRole('link', { name: 'Register a Community' }));
    await expect(page).toHaveURL(/\/fleets\/register$/);
    await caption(
      page,
      'The name starts as your username’s Community. Type over it',
    );
    await replaceInto(
      page,
      page.getByLabel('Name', { exact: true }),
      COMMUNITY,
    );
    await caption(
      page,
      'Web address is made from the name if left blank. The description shows under About',
    );
    await typeInto(
      page,
      page.getByLabel('What the Community is'),
      'The reserve Fleets of the Federation, on Windows and Xbox.',
    );
    await caption(
      page,
      'How people join, Who can see it, and the zone its dates are shown in',
    );
    await choose(page, page.getByLabel('How people join'), 'By application');
    await choose(page, page.getByLabel('Who can see it'), 'Anyone');
    await glide(page, page.getByLabel('Show dates in'));
    await pause(page, 1_500);
    await click(page, page.getByRole('button', { name: 'Register' }));
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);

    const communityPath = new URL(page.url()).pathname;

    await caption(page, 'Registered. You are its Owner');
    await pause(page, 3_000);

    // A Fleet, whose name is already taken.
    await caption(
      page,
      'On the Community’s page: Register a Fleet here, and Register an Armada here',
    );
    await click(
      page,
      page.getByRole('link', { name: `Register a Fleet into ${COMMUNITY}` }),
    );
    await caption(
      page,
      'A Fleet’s name must match the game exactly, spaces at either end included',
    );
    await typeInto(page, page.getByLabel('Name, exactly as in game'), FLEET);
    await choose(page, page.getByLabel('Platform'), 'Windows');
    await caption(
      page,
      'Check for existing records says what already answers to that name there',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Check for existing records' }),
    );
    await glide(page, page.locator('.scope-duplicate-warning').first());
    await caption(
      page,
      'You can still register yours: nobody’s record is the authoritative one',
    );
    await pause(page, 4_000);
    await choose(page, page.getByLabel('Allegiance'), 'Federation');
    await choose(page, page.getByLabel('Who can see it'), 'Anyone');
    await click(page, page.getByRole('button', { name: 'Register' }));
    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    await caption(
      page,
      'How people join starts as the Community’s, and changes under Recruitment',
    );
    await pause(page, 3_000);

    // An Armada.
    await click(page, page.locator('.fleet-scope-card__community a').first());
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    await click(
      page,
      page.getByRole('link', { name: `Register an Armada into ${COMMUNITY}` }),
    );
    await caption(
      page,
      'An Armada needs its Platform and an Allegiance, Federation or Klingon',
    );
    await typeInto(page, page.getByLabel('Name, exactly as in game'), ARMADA);
    await choose(page, page.getByLabel('Platform'), 'Windows');
    await choose(page, page.getByLabel('Allegiance'), 'Federation');
    await caption(
      page,
      'What you call it is optional, and shows beneath the name the game holds',
    );
    await typeInto(page, page.getByLabel('What you call it'), KNOWN_AS);
    await click(
      page,
      page.getByRole('button', { name: 'Check for existing records' }),
    );
    await click(page, page.getByRole('button', { name: 'Register' }));
    await expect(page).toHaveURL(/\/armadas\/windows\/[^/]+$/);
    await glide(page, page.getByText(/Known as/).first());
    await pause(page, 3_000);

    // An emblem and a banner.
    await caption(
      page,
      'Artwork: Set the emblem, the square badge, and Set the banner, the wide header',
    );
    await click(page, page.getByRole('button', { name: 'Set the emblem' }));

    const dialog = page.getByRole('dialog');

    await dialog
      .getByLabel('Choose a picture for the Emblem')
      .setInputFiles(PICTURE);
    await caption(
      page,
      'Choose a JPG or PNG, select the area to keep, and say what it shows',
    );
    await pause(page, 2_500);
    await typeInto(
      page,
      dialog.getByLabel('What does this picture show?'),
      'The Reserve’s delta on a blue field.',
    );
    await click(page, dialog.getByRole('button', { name: 'Upload' }));
    await caption(
      page,
      'Every picture is checked before it is used, and the page shows what it had until then',
    );
    await expect(dialog).toBeHidden({ timeout: 120_000 });
    await pause(page, 2_000);

    await click(page, page.getByRole('button', { name: 'Set the banner' }));
    await dialog
      .getByLabel('Choose a picture for the Banner')
      .setInputFiles(BANNER);
    await caption(
      page,
      'A banner is at least 2400 by 480 pixels; an emblem at least 300 by 300',
    );
    await pause(page, 2_500);
    await typeInto(
      page,
      dialog.getByLabel('What does this picture show?'),
      'A dusk sky over the Reserve’s anchorage.',
    );
    await click(page, dialog.getByRole('button', { name: 'Upload' }));
    await expect(dialog).toBeHidden({ timeout: 120_000 });
    await page.mouse.move(960, 300, { steps: 20 });
    await caption(
      page,
      'The banner heads the page; the emblem sits on its card',
    );
    await pause(page, 4_000);

    // Renamed under Settings.
    await page.goto(`${communityPath}/manage`);
    await caption(
      page,
      'Changing a record afterwards: Settings is the first choice under Manage',
    );
    await click(
      page,
      page.getByRole('link', { name: 'Settings', exact: true }),
    );
    await expect(page).toHaveURL(/\/manage\/settings$/);
    await replaceInto(page, page.getByLabel('Name', { exact: true }), RENAMED);
    await click(page, page.getByRole('button', { name: 'Save' }));
    await caption(
      page,
      'Renaming makes a new web address from the new name. The old one still leads here',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-03-registering')}`);
  }
});
