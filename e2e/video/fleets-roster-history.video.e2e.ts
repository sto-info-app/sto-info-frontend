import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import {
  importRoster,
  registerCommunity,
  registerFleet,
  rosterRow,
} from './support/prepare';

/**
 * The Fleets section's "Roster history and corrections" guide, as a video
 * (13 October 2026): the History tab's intervals, a rename confirmed under
 * Roster identities, ranks ordered, and an import marked partial under its
 * Corrections.
 *
 * Off camera the Owner registers the Community and a Fleet, and imports two
 * exports a month apart: between them one member is promoted, one is
 * renamed, and one joins. The Owner records.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Roster history and corrections', async ({ as, browser }, info) => {
  test.setTimeout(900_000);

  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await importRoster(
    owner,
    fleetPath,
    FLEET,
    [
      rosterRow('Aria Venn', 'fixture001'),
      rosterRow('Dax Orlan', 'fixture002', 'Recruit'),
      rosterRow('Kira Tal', 'fixture003'),
    ],
    '20240101-120000',
  );

  const secondImportPath = await importRoster(
    owner,
    fleetPath,
    FLEET,
    [
      rosterRow('Aria Venn', 'fixture001'),
      rosterRow('Dax Orlan', 'fixture002'),
      rosterRow('Kira Tal-Vess', 'fixture003'),
      rosterRow('Sela Vor', 'fixture004', 'Recruit'),
    ],
    '20240201-120000',
  );

  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The History tab.
    await page.goto(`${fleetPath}/history`);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'History lines the exports up in the order they were taken, and says what changed between each',
    );
    await pause(page, 3_500);
    await glide(page, page.locator('.roster-history__interval').first());
    await caption(
      page,
      'Each block is one interval: members at each end, joins, departures, renames and rank changes',
    );
    await pause(page, 4_000);
    await caption(
      page,
      'A renamed Character looks like one leaving and another joining, until somebody confirms the rename',
    );
    await pause(page, 3_500);

    // Roster identities.
    await page.goto(`${fleetPath}/investigate`);
    await caption(
      page,
      'Corrections are on the Investigate tab, and every one asks why',
    );
    await pause(page, 2_500);
    await click(
      page,
      page.getByRole('link', { name: 'Roster identities', exact: true }),
    );
    await caption(
      page,
      'Roster identities: suggested renames, graded High, Medium or Low confidence',
    );

    const candidate = page
      .locator('.roster-identities__item')
      .filter({ hasText: 'Kira Tal' })
      .first();

    await glide(page, candidate);
    await pause(page, 3_000);
    await click(page, candidate.getByRole('button', { name: 'Confirm' }));

    const dialog = page.getByRole('dialog');

    await typeInto(
      page,
      dialog.getByRole('textbox'),
      'Kira told us about the rename in Fleet chat.',
    );
    await click(page, dialog.getByRole('button', { name: /^Confirm/ }));
    await pause(page, 2_000);
    await caption(
      page,
      'Confirmed, the history shows a rename rather than a departure and a join. Undo takes it back',
    );
    await pause(page, 4_000);

    // Rank order.
    await page.goto(`${fleetPath}/investigate/rank-order`);
    await caption(
      page,
      'Rank order: give each rank a tier, 1 the highest, so a change reads as a promotion or demotion',
    );

    const ranks = page.getByRole('form', { name: 'Rank order' });

    await typeInto(page, ranks.getByLabel('Member', { exact: true }), '1');
    await typeInto(page, ranks.getByLabel('Recruit', { exact: true }), '2');
    await typeInto(
      page,
      ranks.getByLabel('Why'),
      'Our two ranks, as the game orders them.',
    );
    await click(page, ranks.getByRole('button', { name: 'Save' }));
    await pause(page, 3_500);

    // Corrections on an import.
    await page.goto(secondImportPath);
    await caption(
      page,
      'An import’s page has its Corrections: Take it out, Mark it partial, or Read it again',
    );

    const corrections = page.getByRole('region', {
      name: 'Corrections',
      exact: true,
    });

    await glide(
      page,
      corrections.getByText('Corrections', { exact: true }).first(),
    );
    await pause(page, 2_500);
    await typeInto(
      page,
      corrections.getByLabel('Why', { exact: true }),
      'Taken mid-reshuffle; two members were missing from it.',
    );
    await click(
      page,
      corrections.getByRole('button', { name: 'Mark it partial' }),
    );
    await expect(
      corrections
        .getByText(
          'Marked partial: nobody missing from it is taken to have left.',
        )
        .first(),
    ).toBeVisible();
    await caption(
      page,
      'Marked partial: nobody missing from it is taken to have left. Mark it complete undoes it',
    );
    await pause(page, 4_000);
    await caption(
      page,
      'After a correction the pages may say the history is being worked out. It catches up by itself',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-15-roster-history')}`);
  }
});
