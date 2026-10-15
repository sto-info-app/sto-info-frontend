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
  ROSTER_HEADER,
  registerCommunity,
  registerFleet,
  rosterRow,
} from './support/prepare';

/**
 * The Fleets section's "Importing a roster export" guide, as a video (13
 * October 2026): an export checked, the clock warning on one whose dates
 * come out after now, a sound export imported and followed to Imported, and
 * a former name recorded on the Investigate tab.
 *
 * Off camera the Owner registers the Community and a Fleet. The Owner
 * records.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';
const FORMER_NAME = 'Reserve Fleet';

/**
 * An export, as the game would write it.
 *
 * @param takenAt - Its stamp, as the game names the file.
 * @returns The file, for the form.
 */
const exportTaken = (
  takenAt: string,
): { name: string; mimeType: string; buffer: Buffer } => ({
  name: `${FLEET}_${takenAt}.Csv`,
  mimeType: 'text/csv',
  buffer: Buffer.from(
    `${[
      ROSTER_HEADER,
      rosterRow('Aria Venn', 'fixture001'),
      rosterRow('Dax Orlan', 'fixture002', 'Recruit'),
      rosterRow('Kira Tal', 'fixture003'),
    ].join('\r\n')}\r\n`,
    'utf8',
  ),
});

/**
 * Tomorrow, as the game stamps a file: an export that cannot have been
 * taken yet.
 *
 * @returns The stamp.
 */
const tomorrowStamp = (): string =>
  `${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10).replaceAll('-', '')}-120000`;

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Importing a roster export', async ({ as, browser }, info) => {
  test.setTimeout(900_000);

  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // Where it is.
    await page.goto(fleetPath);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'A roster export is the file the game writes listing a Fleet’s members: a snapshot of one moment',
    );
    await pause(page, 3_500);
    await click(
      page,
      page.getByRole('link', { name: /Check a roster export for/ }),
    );
    await caption(
      page,
      'Leave the file exactly as the game wrote it: its name is the only place it says which Fleet and when',
    );
    await pause(page, 3_500);

    // The clock warning.
    const file = page.getByLabel('The export, as the game wrote it');

    await glide(page, file);
    await file.setInputFiles(exportTaken(tomorrowStamp()));
    await caption(
      page,
      'The clock it was taken on: the file never says which. A wrong zone quietly moves every date',
    );
    // The zones are offered by their descriptions, so by value.
    await glide(page, page.getByLabel('The clock it was taken on'));
    await page.getByLabel('The clock it was taken on').selectOption('UTC');
    await pause(page, 1_000);
    await click(page, page.getByRole('button', { name: 'Check this export' }));
    await glide(page, page.getByText('Dates after now').first());
    await caption(
      page,
      'A date later than now is warned about, since that usually means the zone is wrong',
    );
    await pause(page, 3_000);
    await glide(
      page,
      page.getByText('The timezone is right; import it anyway'),
    );
    await pause(page, 3_000);

    // A sound export.
    await caption(page, 'The right file, checked again');
    await file.setInputFiles(exportTaken('20240101-120000'));
    await click(page, page.getByRole('button', { name: 'Check this export' }));
    await expect(page.getByText('Ready to import')).toBeVisible();
    await caption(
      page,
      'Ready to import: every row read and the filename checks out. The first rows show each date twice',
    );
    await glide(page, page.getByText('Ready to import').first());
    await pause(page, 4_000);
    await click(page, page.getByRole('button', { name: 'Import this export' }));
    await expect(page).toHaveURL(/\/investigate\/imports\/[^/]+$/);
    await caption(
      page,
      'The import’s own page follows it: Scanning, then Reading, then Imported',
    );
    await expect(page.getByText('Imported', { exact: true })).toBeVisible({
      timeout: 180_000,
    });
    await pause(page, 3_500);
    await caption(
      page,
      'Held, Refused or Abandoned say what stopped one. Nothing is kept from a refused file',
    );
    await pause(page, 3_500);

    // A former name.
    await page.goto(`${fleetPath}/investigate`);
    await caption(
      page,
      'The Investigate tab: Roster imports, and Former names for a Fleet renamed in game',
    );
    await pause(page, 2_500);
    await click(
      page,
      page.getByRole('link', { name: 'Former names', exact: true }),
    );

    const form = page.getByRole('form', { name: 'Add a former name' });

    await caption(
      page,
      'Give the name exactly as the filename has it, when it was used, and why',
    );
    await typeInto(
      page,
      form.getByLabel('Name, exactly as in game'),
      FORMER_NAME,
    );
    await click(page, form.getByLabel('Used from'));
    await form.getByLabel('Used from').fill('2023-01-01');
    await click(page, form.getByLabel('Used until'));
    await form.getByLabel('Used until').fill('2023-12-31');
    await typeInto(
      page,
      form.getByLabel('Why'),
      'Renamed in game at the start of 2024.',
    );
    await click(page, form.getByRole('button', { name: 'Record this name' }));
    await pause(page, 2_000);
    await caption(
      page,
      'Only exports taken between those days match it. Renaming on Settings does not record the old name',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-14-importing-a-roster')}`,
    );
  }
});
