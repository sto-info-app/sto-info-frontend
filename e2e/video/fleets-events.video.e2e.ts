import { expect } from '@playwright/test';

import { backendSupport } from '../support/backend';
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
  replaceInto,
  typeInto,
} from './support/clip';
import {
  characterLabelOf,
  joinFleet,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Events" guide, as a video (13 October 2026): a
 * weekly event organised, "Show what it comes to", an answer given as a
 * Character, reminders asked for, the waitlist filling from the member's
 * side, and attendance marked once the occurrence has started.
 *
 * Off camera the Owner registers the Community and an open Fleet, which the
 * applicant joins. The Owner records; the clip becomes the member to take
 * the waitlist.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';
const TITLE = 'Friday Fleet Night';

/**
 * A day ahead, as the form takes it.
 *
 * @param days - How many days ahead.
 * @returns The day, as `YYYY-MM-DD`.
 */
const dayAfter = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Events', async ({ as, browser }, info) => {
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

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The calendar.
    await page.goto(`${fleetPath}/events`);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Every Community, Fleet and Armada has a calendar: a Month or an Agenda, a month at a time',
    );
    await pause(page, 3_500);

    // Organising.
    await click(page, page.getByRole('link', { name: 'New event' }));
    await caption(
      page,
      'New event: a Title, a Description in Markdown, and a link if there is one',
    );
    await typeInto(page, page.getByLabel('Title'), TITLE);
    await typeInto(
      page,
      page.getByLabel('Description (Markdown, optional)'),
      'Two Task Force Operations, then a Fleet action.',
    );
    await caption(
      page,
      'Who it is for, and On the clock of: the zone its times are set in',
    );
    await choose(
      page,
      page.getByLabel('Who it is for'),
      'Members of the Fleet',
    );
    await glide(page, page.getByLabel('On the clock of'));
    await pause(page, 1_500);
    await caption(
      page,
      'How often: Once, Weekly, Monthly on a day, or Monthly on a weekday',
    );
    await click(page, page.getByRole('radio', { name: 'Weekly', exact: true }));
    await click(
      page,
      page
        .getByRole('group', { name: 'On which days' })
        .getByRole('checkbox', { name: 'Friday' }),
    );
    await click(page, page.getByLabel('Starting', { exact: true }));
    await page.getByLabel('Starting', { exact: true }).fill(dayAfter(2));
    await click(page, page.getByLabel('Start', { exact: true }));
    await page.getByLabel('Start', { exact: true }).fill('20:00');
    await replaceInto(page, page.getByLabel('Minutes long (5 to 1440)'), '90');
    await caption(page, 'Places for Going: empty for no limit');
    await typeInto(
      page,
      page.getByLabel('Places for Going (1 to 1000; empty for no limit)'),
      '1',
    );
    await caption(
      page,
      'Show what it comes to lists every occurrence over the next year, on the event’s clock and yours',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Show what it comes to' }),
    );
    await pause(page, 4_000);
    await click(page, page.getByRole('button', { name: 'Create the event' }));
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();

    const eventPath = new URL(page.url()).pathname;

    // Answering.
    await caption(
      page,
      'Each occurrence takes its own answer: Going, Maybe or Can’t go, open until it starts',
    );
    await choose(
      page,
      // One answer form per occurrence listed; the first is the next one.
      page.getByLabel('As which Character (optional)').first(),
      characterLabelOf(people.owner),
    );
    await click(
      page,
      page.getByRole('button', { name: 'Going', exact: true }).first(),
    );
    await expect(
      page.getByText('You are going, with a place.').first(),
    ).toBeVisible();
    await caption(page, 'You are going, with a place. Maybe holds no place');
    await pause(page, 3_000);

    // Reminders.
    const reminders = page.getByRole('group', { name: 'Remind me' });

    await caption(
      page,
      'Remind me: 15 minutes, an hour or a day before, in any combination, under Notifications',
    );
    await click(
      page,
      reminders.getByRole('checkbox', { name: 'An hour before', exact: true }),
    );
    await click(
      page,
      reminders.getByRole('button', { name: 'Save reminders' }),
    );
    await pause(page, 3_000);

    const occurrenceLink = page
      .getByRole('region', { name: 'What lies ahead' })
      .getByRole('link')
      .first();
    const occurrencePath = new URL(
      (await occurrenceLink.getAttribute('href')) ?? '',
      page.url(),
    ).pathname;

    // The waitlist, from the member's side.
    await becomeRole(page, 'applicant');
    await page.goto(eventPath);
    await caption(
      page,
      'A member: the one place is taken, so Going puts them on the waitlist',
    );
    await glide(
      page,
      page
        .getByText(
          'Every place is taken, so answering Going puts you on the waitlist.',
        )
        .first(),
    );
    await pause(page, 2_500);
    await click(
      page,
      page.getByRole('button', { name: 'Going', exact: true }).first(),
    );
    await expect(
      page.getByText(/You are going, and waiting for a place/).first(),
    ).toBeVisible();
    await caption(
      page,
      'When a place comes free before the start, the first in line gets it and is told',
    );
    await pause(page, 4_000);

    // Attendance, once the occurrence has started.
    const { started } = backendSupport<{ started: number }>(
      'fleet-start',
      occurrencePath.split('/').pop() ?? '',
    );

    expect(started).toBe(1);
    await becomeRole(page, 'owner');
    await page.goto(occurrencePath);
    await caption(
      page,
      'Once an occurrence has started, the managers mark each person under Who came',
    );

    const sheet = page.getByRole('region', { name: 'Who came' });

    await glide(page, sheet.getByText('Who came', { exact: true }).first());
    await pause(page, 2_000);
    await click(
      page,
      sheet.getByRole('button', {
        name: `${people.applicant.username} came`,
        exact: true,
      }),
    );
    await caption(
      page,
      'Came or Did not come, recorded as the Character they answered with. A second record corrects the first',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-10-events')}`);
  }
});
