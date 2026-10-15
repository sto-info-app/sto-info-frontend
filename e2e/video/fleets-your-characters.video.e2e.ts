import { expect } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
} from '../support/fleet-people';
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
  characterPathOf,
  importRoster,
  registerCommunity,
  registerFleet,
  rosterRow,
} from './support/prepare';

/**
 * The Fleets section's "Your Characters and their Fleets" guide, as a video
 * (13 October 2026): a Character's Fleet panel, a Fleet recorded by hand, a
 * roster question answered Yes, and "I have left this Fleet".
 *
 * Off camera the Owner registers two Fleets and imports into the second a
 * roster export naming the applicant's Character, which raises the question.
 * The applicant records.
 */

const COMMUNITY = 'Starfleet Reserve';
const RECORDED_FLEET = 'Reserve Fleet Alpha';
const ASKING_FLEET = 'Reserve Fleet Beta';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Your Characters and their Fleets', async ({ as, browser }, info) => {
  test.setTimeout(900_000);

  const { people } = fleetPeople();
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);

  await registerFleet(owner, communityPath, COMMUNITY, RECORDED_FLEET);

  const askingPath = await registerFleet(
    owner,
    communityPath,
    COMMUNITY,
    ASKING_FLEET,
  );

  await importRoster(owner, askingPath, ASKING_FLEET, [
    rosterRow('Aria Venn', 'fixture001'),
    rosterRow(people.applicant.characterName, people.applicant.accountHandle),
  ]);

  // The question is raised once the import is replayed, a little after it
  // is read; the applicant's page is watched until it has arrived.
  const applicant = await as('applicant');
  const characterPath = characterPathOf(people.applicant);

  await expect(async () => {
    await applicant.goto(characterPath);
    await expect(
      applicant.locator('.character-fleet__proposal').filter({
        hasText: ASKING_FLEET,
      }),
    ).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 240_000 });
  await readNotices(applicant);

  const clip = await openClip(browser, info, 'applicant');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The panel.
    await page.goto('/dashboard');
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'From your Dashboard: Manage STO Accounts, an account, then one of its Characters',
    );
    await pause(page, 3_000);
    await page.goto(characterPath);
    await caption(
      page,
      'The Fleet panel on a Character’s page: what you say about your own Character',
    );
    await glide(page, page.getByText('Awaiting your answer', { exact: true }));
    await pause(page, 3_500);

    // Recording a Fleet by hand.
    await caption(
      page,
      'Record a Fleet: it needs a record on STO Info that you can see',
    );
    await click(page, page.getByRole('button', { name: 'Record a Fleet' }));
    await typeInto(page, page.getByLabel('Find the Fleet'), 'Reserve Fleet');
    await click(page, page.getByRole('button', { name: 'Search' }));
    await caption(
      page,
      'Each result shows its platform, and the Community holding it or no Community',
    );
    await pause(page, 2_500);
    await click(
      page,
      page
        .locator('.character-fleet__result')
        .filter({ hasText: RECORDED_FLEET })
        .first(),
    );
    await caption(
      page,
      'Joined on, and Who can see this, which starts at Only me',
    );
    await click(page, page.getByLabel('Joined on'));
    // Before the export that will ask about the other Fleet was taken, so
    // that saying yes to it can end this entry rather than overlap it.
    await page.getByLabel('Joined on').fill('2023-06-01');
    await pause(page, 1_000);
    await choose(page, page.getByLabel('Who can see this'), 'Fleet members');
    await click(page, page.getByRole('button', { name: 'Record it' }));
    await expect(
      page.locator('.character-fleet__entry').filter({
        hasText: RECORDED_FLEET,
      }),
    ).toBeVisible();
    await caption(
      page,
      'Recorded under Currently. A Character is in one Fleet at a time',
    );
    await pause(page, 3_500);

    // Answering a roster question.
    await caption(
      page,
      'A Fleet’s roster export listed a Captain with your Character’s exact name and handle',
    );
    await glide(
      page,
      page.locator('.character-fleet__proposal').filter({
        hasText: ASKING_FLEET,
      }),
    );
    await pause(page, 3_500);
    await caption(
      page,
      'Only you can say whether it is yours. Yes records the Fleet from when the export was taken',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Yes, that is this Captain' }),
    );
    await expect(
      page.locator('.character-fleet__entry').filter({
        hasText: ASKING_FLEET,
      }),
    ).toBeVisible();
    await caption(
      page,
      'Recording a new Fleet ends the current one, which moves under Previously',
    );
    await glide(page, page.getByText('Previously', { exact: true }));
    await pause(page, 4_000);

    // Leaving.
    await caption(
      page,
      'I have left this Fleet ends the entry now. Remove takes one recorded by mistake out',
    );
    await click(
      page,
      page.getByRole('button', { name: 'I have left this Fleet' }),
    );
    await pause(page, 3_000);
    await caption(
      page,
      'Nothing here changes a roster, or your membership. Those live on the Fleet’s own page',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-05-your-characters')}`);
  }
});
