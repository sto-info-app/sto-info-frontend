import { expect } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
} from '../support/fleet-people';
import {
  becomeRole,
  caption,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import {
  characterLabelOf,
  joinFleet,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "When a moderator acts" guide, as a video (13
 * October 2026): a member suspended by the Owner and what the member sees,
 * then a Fleet suspended by a site administrator, what its Owner sees, and
 * both reinstated.
 *
 * Off camera the Owner registers the Community and an open Fleet, which the
 * applicant joins. The Owner records; the clip becomes the member, the site
 * administrator and the Owner in turn.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('When a moderator acts', async ({ as, browser }, info) => {
  const { people } = fleetPeople();
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(
    owner,
    communityPath,
    COMMUNITY,
    FLEET,
    {
      recruitment: 'Anyone eligible may join',
    },
  );

  await joinFleet(
    await as('applicant'),
    fleetPath,
    characterLabelOf(people.applicant),
  );
  await readNotices(owner);
  await readNotices(await as('applicant'));

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;
  const dialog = page.getByRole('dialog');
  const row = page.getByRole('row', {
    name: new RegExp(people.applicant.username),
  });

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // A membership suspended.
    await page.goto(`${fleetPath}/recruitment/members`);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Two kinds of people can step in: a record’s own Owner and Admins, and the site’s administrators',
    );
    await pause(page, 3_500);
    await caption(
      page,
      'Members, under Recruitment: Suspend…, Reinstate… and Remove…, each asking for a reason',
    );
    await click(page, row.getByRole('button', { name: 'Suspend…' }));

    const suspend = page.getByRole('form', { name: 'Suspend a member' });

    await typeInto(
      page,
      suspend.getByLabel('Reason'),
      'Repeated no-shows at Fleet events.',
    );
    await click(page, suspend.getByRole('button', { name: 'Suspend' }));
    await expect(
      page.getByText(/They are suspended: they keep their membership/),
    ).toBeVisible();
    await caption(
      page,
      'They keep their place and lose everything membership gives until reinstated',
    );
    await pause(page, 3_500);

    // From the member's side.
    await becomeRole(page, 'applicant');
    await page.goto(fleetPath);
    await caption(
      page,
      'The member: the Fleet’s page offers nothing under Recruitment, and says why',
    );
    await glide(
      page,
      page.getByText('Your membership of this Fleet is suspended.'),
    );
    await pause(page, 3_500);
    await page.goto('/notifications');
    await caption(
      page,
      'They are told under Notifications, but never why. No switch stops this notice',
    );
    await glide(
      page,
      page.getByText(`Your membership of ${FLEET} has been suspended.`).first(),
    );
    await pause(page, 4_000);

    // Reinstated.
    await becomeRole(page, 'owner');
    await page.goto(`${fleetPath}/recruitment/members`);
    await click(page, row.getByRole('button', { name: 'Reinstate…' }));

    const reinstate = page.getByRole('form', { name: 'Reinstate a member' });

    await typeInto(
      page,
      reinstate.getByLabel('Reason'),
      'Back in touch, and attending again.',
    );
    await click(page, reinstate.getByRole('button', { name: 'Reinstate' }));
    await expect(
      page.getByText('Their membership is in force again.'),
    ).toBeVisible();
    await caption(
      page,
      'Reinstated, everything comes back, and they are told again',
    );
    await pause(page, 3_000);

    // A Fleet suspended by a site administrator.
    await becomeRole(page, 'admin');
    await page.goto(`${communityPath}/manage/dispute`);
    await caption(
      page,
      'A site administrator, on the Community’s Site administration page, can suspend a Fleet',
    );

    const fleet = page.getByRole('article').filter({ hasText: FLEET });

    await glide(page, fleet.getByRole('button', { name: 'Suspend…' }));
    await pause(page, 2_000);
    await click(page, fleet.getByRole('button', { name: 'Suspend…' }));
    await typeInto(
      page,
      dialog.getByLabel('Reason'),
      'Ownership disputed; held while it is looked into.',
    );
    await click(
      page,
      dialog.getByRole('button', { name: 'Suspend', exact: true }),
    );
    await expect(
      page.getByText('It is suspended: it can be read, and nothing in it'),
    ).toBeVisible();
    await caption(
      page,
      'Everything stays readable, nothing can change, and nothing ends: roles and members stand',
    );
    await pause(page, 3_500);

    // What the Owner sees.
    await becomeRole(page, 'owner');
    await page.goto(fleetPath);
    await caption(
      page,
      'Its page and its card say Suspended. The Owner and Admins are sent a notice, without the reason',
    );
    await glide(page, page.getByText('Suspended', { exact: true }).first());
    await pause(page, 3_500);
    await page.goto(`${fleetPath}/manage/history`);
    await caption(
      page,
      'Its history, under Manage, credits the action to A site administrator, with the reason given',
    );
    await glide(
      page,
      page.getByText(/A site administrator suspended it/).first(),
    );
    await pause(page, 4_000);

    // Reinstated.
    await becomeRole(page, 'admin');
    await page.goto(`${communityPath}/manage/dispute`);
    await click(page, fleet.getByRole('button', { name: 'Reinstate…' }));
    await typeInto(
      page,
      dialog.getByLabel('Reason'),
      'Dispute settled in the Owner’s favour.',
    );
    await click(
      page,
      dialog.getByRole('button', { name: 'Reinstate', exact: true }),
    );
    await expect(page.getByText('Its suspension is lifted.')).toBeVisible();
    await caption(
      page,
      'Only a site administrator can reinstate what one suspended. Ask through Contact us',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-13-when-a-moderator-acts')}`,
    );
  }
});
