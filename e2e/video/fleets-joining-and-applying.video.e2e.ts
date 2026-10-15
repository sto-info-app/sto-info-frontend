import { expect } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
} from '../support/fleet-people';
import {
  becomeRole,
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
  characterLabelOf,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Joining and applying to a Fleet" guide, as a video
 * (13 October 2026): an open Fleet joined, an application sent to another
 * and decided by the Owner, an invitation sent and accepted, and leaving.
 *
 * Off camera the Owner registers one open Fleet and one taking
 * applications, and sets a question on the second's form. The applicant
 * records; the clip becomes the Owner to decide and to invite, and the
 * friend to accept.
 */

const COMMUNITY = 'Starfleet Reserve';
const OPEN_FLEET = 'Reserve Fleet Alpha';
const APPLICATION_FLEET = 'Reserve Fleet Beta';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Joining and applying to a Fleet', async ({ as, browser }, info) => {
  const { people } = fleetPeople();
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const openPath = await registerFleet(
    owner,
    communityPath,
    COMMUNITY,
    OPEN_FLEET,
    { recruitment: 'Anyone eligible may join' },
  );
  const applicationPath = await registerFleet(
    owner,
    communityPath,
    COMMUNITY,
    APPLICATION_FLEET,
    { recruitment: 'By application' },
  );

  await owner.goto(`${applicationPath}/recruitment/settings`);
  await owner
    .getByLabel('In your own words')
    .fill('We run Fleet events on Friday evenings, UK time.');
  await owner.getByRole('button', { name: 'Add a question' }).click();
  await owner
    .getByLabel('What it asks')
    .first()
    .fill('What do you most enjoy playing?');
  await owner.getByRole('button', { name: 'Save' }).click();
  await expect(
    owner
      .getByText('Saved.', { exact: true })
      .or(owner.getByText('Nothing has changed to save.', { exact: true })),
  ).toBeVisible();

  const applicant = await as('applicant');

  await readNotices(applicant);

  const clip = await openClip(browser, info, 'applicant');
  const { page } = clip;
  const dialog = page.getByRole('dialog');

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // Joining an open Fleet.
    await page.goto(openPath);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Recruitment, on a Fleet’s page, says how it recruits and offers what you can do',
    );
    await glide(page, page.getByText('Recruitment', { exact: true }).first());
    await pause(page, 3_000);
    await caption(
      page,
      'Open: choose a Character on the Fleet’s platform, and you are a member at once',
    );
    await choose(
      page,
      page.getByLabel('Your Character in this Fleet'),
      characterLabelOf(people.applicant),
    );
    await click(page, page.getByRole('button', { name: 'Join this Fleet' }));
    await expect(
      page.getByRole('button', { name: 'Leave this Fleet' }),
    ).toBeVisible();
    await caption(
      page,
      'A question now waits on your Character’s page, for once an officer has invited you in game',
    );
    await pause(page, 4_000);

    // Applying.
    await page.goto(applicationPath);
    await caption(
      page,
      'Taking applications: the Fleet’s officers decide each one',
    );
    await glide(page, page.getByText('Recruitment', { exact: true }).first());
    await pause(page, 3_000);
    await click(page, page.getByRole('link', { name: 'Apply to join' }));
    await caption(
      page,
      'Choose Your Character and answer the Fleet’s questions',
    );
    await choose(
      page,
      page.getByLabel('Your Character'),
      characterLabelOf(people.applicant),
    );
    await typeInto(
      page,
      page.getByLabel('What do you most enjoy playing?'),
      'Task Force Operations, and the odd Fleet event.',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Send the application' }),
    );
    await expect(page.getByText(/Your application is sent\./)).toBeVisible();
    await pause(page, 2_500);
    await page.goto('/fleets/applications');
    await caption(
      page,
      'Your Fleet applications, from your Dashboard, lists each with its status',
    );
    await glide(page, page.getByText('Waiting for a decision').first());
    await pause(page, 4_000);

    // Decided by the Owner.
    await becomeRole(page, 'owner');
    await page.goto(`${applicationPath}/recruitment/applications`);
    await caption(
      page,
      'For the officers: the Recruitment tab, then Applications',
    );
    await pause(page, 2_500);
    await click(
      page,
      page.getByRole('link', { name: people.applicant.characterName }).first(),
    );
    await caption(
      page,
      'The answers, the Character’s level and faction, and what the roster says',
    );
    await glide(page, page.getByText('Decide', { exact: true }).first());
    await pause(page, 3_000);
    await click(page, page.getByRole('radio', { name: 'Accept' }));
    await typeInto(
      page,
      page.getByLabel('Note (optional)'),
      'Welcome aboard. See you on Friday.',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Record the decision' }),
    );
    await expect(page.getByText('The decision is recorded.')).toBeVisible();
    await caption(
      page,
      'Accepting makes them a member here at once. A rejection always needs a reason',
    );
    await pause(page, 3_500);

    // Inviting.
    await page.goto(`${applicationPath}/recruitment/invitations`);
    await caption(
      page,
      'Invitations: an STO Info username, whether or not the Fleet is recruiting',
    );
    await typeInto(
      page,
      page.getByLabel('STO Info username'),
      people.friend.username,
    );
    await click(
      page,
      page.getByRole('button', { name: 'Send the invitation' }),
    );
    await pause(page, 1_500);
    await caption(
      page,
      'It skips the Fleet’s requirements and stands for 14 days',
    );
    await pause(page, 3_000);

    // Accepted by the friend.
    await becomeRole(page, 'friend');
    await page.goto('/fleets/applications');
    await caption(
      page,
      'The invited person answers on Your Fleet applications, with a Character',
    );
    await choose(
      page,
      page.getByLabel('Your Character in this Fleet'),
      characterLabelOf(people.friend),
    );
    await click(
      page,
      page.getByRole('button', { name: 'Accept', exact: true }),
    );
    await pause(page, 2_500);
    await caption(page, 'Accepting makes you a member at once');
    await pause(page, 3_000);

    // Leaving.
    await page.goto(applicationPath);
    await caption(
      page,
      'Leave this Fleet ends your membership here, and any role you hold at the Fleet',
    );
    await click(page, page.getByRole('button', { name: 'Leave this Fleet' }));
    await pause(page, 1_500);
    await click(
      page,
      dialog.getByRole('button', { name: 'Leave', exact: true }),
    );
    await expect(page).toHaveURL(/\/fleets\/applications/);
    await caption(
      page,
      'It does not take you out of the Fleet in game, or change your Character’s own record',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-06-joining-and-applying')}`,
    );
  }
});
