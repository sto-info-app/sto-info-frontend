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
  joinFleet,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Roles, ownership and closing" guide, as a video (13
 * October 2026): the four roles, an Officer appointed at a Fleet, a
 * capability delegated to every Officer, an Admin appointed at the
 * Community, ownership offered and accepted from the Admin's side, the
 * history, and a Fleet closed by typing its name.
 *
 * Off camera the Owner registers a Community with an open Fleet, which two
 * people join. The Owner records; the clip becomes the Admin to accept.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Roles, ownership and closing', async ({ as, browser }, info) => {
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
    await as('officer'),
    fleetPath,
    characterLabelOf(people.officer),
  );
  await joinFleet(
    await as('applicant'),
    fleetPath,
    characterLabelOf(people.applicant),
  );
  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The four roles, and where Manage is.
    await page.goto(fleetPath);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Four fixed roles run every record: Owner, Admin, Officer and Member',
    );
    await pause(page, 3_500);
    await click(
      page,
      page.getByRole('link', { name: 'Manage', exact: true }).first(),
    );
    await expect(page).toHaveURL(/\/manage$/);
    await caption(
      page,
      'Manage offers Roles, Delegation and History, and closing at its foot',
    );
    await pause(page, 3_500);

    // Appointing an Officer.
    await click(page, page.getByRole('link', { name: 'Roles', exact: true }));
    await expect(page).toHaveURL(/\/manage\/roles$/);

    const appoint = page.getByRole('form', { name: 'Appoint somebody' });

    await caption(
      page,
      'Appoint somebody: only members can be appointed, one role each',
    );
    await choose(page, appoint.getByLabel('Person'), people.officer.username);
    await choose(page, appoint.getByLabel('Role'), 'Officer');
    await typeInto(
      page,
      appoint.getByLabel('Why (optional)'),
      'Runs our weekly events.',
    );
    await click(page, appoint.getByRole('button', { name: 'Appoint' }));
    await expect(page.getByText('Appointed.', { exact: true })).toBeVisible();
    await caption(
      page,
      'An Officer holds nothing extra until the Owner says what, under Delegation',
    );
    await pause(page, 3_500);

    // Delegating to every Officer.
    await page.goto(`${fleetPath}/manage/delegation`);
    await caption(
      page,
      'What every Officer holds: tick capabilities, and Save applies them to each Officer',
    );
    await click(page, page.getByRole('checkbox', { name: /Manage events/ }));
    await click(page, page.getByRole('checkbox', { name: /Write news/ }));
    await click(
      page,
      page
        .getByRole('form', { name: 'What every Officer holds' })
        .getByRole('button', { name: 'Save' }),
    );
    await pause(page, 2_000);
    await caption(
      page,
      'Particular people can be granted or denied one capability; a denial beats any role',
    );
    await glide(page, page.getByText('Particular people').first());
    await pause(page, 3_500);

    // An Admin at the Community.
    await page.goto(`${communityPath}/manage/roles`);
    await caption(page, 'A role held at a Community reaches every Fleet in it');
    await choose(page, appoint.getByLabel('Person'), people.applicant.username);
    await choose(page, appoint.getByLabel('Role'), 'Admin');
    await click(page, appoint.getByRole('button', { name: 'Appoint' }));
    await expect(page.getByText('Appointed.', { exact: true })).toBeVisible();
    await pause(page, 2_000);

    // Offering ownership.
    await page.goto(`${communityPath}/manage/ownership`);
    await caption(
      page,
      'Ownership: pick one of the Community’s Admins and offer it',
    );

    const offer = page.getByRole('form', { name: 'Offer ownership' });

    await choose(page, offer.getByLabel('Admin'), people.applicant.username);
    await click(page, offer.getByRole('button', { name: 'Offer ownership…' }));

    const dialog = page.getByRole('dialog');

    await pause(page, 2_000);
    await click(page, dialog.getByRole('button', { name: 'Offer it' }));
    await expect(page.getByText('Open offer')).toBeVisible();
    await caption(
      page,
      'It moves only if they accept within seven days. Take the offer back… cancels it',
    );
    await pause(page, 4_000);

    // Accepted from the Admin's side.
    await becomeRole(page, 'applicant');
    await page.goto(communityPath);
    await caption(
      page,
      'The Admin is told by a notice, and sees Ownership offered to you',
    );
    await glide(page, page.getByText('Ownership offered to you').first());
    await pause(page, 3_500);
    await click(page, page.getByRole('button', { name: 'Accept…' }));
    await pause(page, 2_000);
    await click(
      page,
      dialog.getByRole('button', { name: 'Accept', exact: true }),
    );
    await expect(page.getByText(/You are now the Owner of/)).toBeVisible();
    await caption(
      page,
      'On acceptance they own the Community and all it holds; the old Owner stays as an Admin',
    );
    await pause(page, 4_000);

    // The history.
    await page.goto(`${communityPath}/manage/history`);
    await caption(
      page,
      'History keeps the newest fifty changes, for the Owner and Admins',
    );
    await pause(page, 4_000);

    // Closing a Fleet.
    await page.goto(`${fleetPath}/manage`);
    await caption(page, 'Closing: at the foot of Manage, Close…');
    await click(page, page.getByRole('button', { name: 'Close…' }));
    await caption(
      page,
      'Type the name exactly as shown, say why, and choose Close it. It cannot be undone',
    );
    await typeInto(
      page,
      dialog.getByLabel(/Type the Fleet’s name to confirm/),
      FLEET,
    );
    await typeInto(
      page,
      dialog.getByLabel('Why'),
      'The Fleet has merged into the Beta.',
    );
    await click(page, dialog.getByRole('button', { name: 'Close it' }));
    await expect(page.getByText(/This Fleet is closed/)).toBeVisible();
    await caption(
      page,
      'Every role there ends, its events are cancelled, and its page stays readable',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-04-roles-ownership-and-closing')}`,
    );
  }
});
