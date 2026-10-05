import { expect, Page } from '@playwright/test';

import { backendSupport } from '../support/backend';
import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The events checks owed by FC-028 and FC-030, signed in (FC-044): an Owner
 * previews and creates repeating events, across the clocks going back and on
 * a day some months lack, and chooses who each is for; a member answers,
 * waits in line and is promoted, asks to be reminded and is told of changes;
 * once an occurrence has started its attendance is recorded and reported; and
 * the editor and an occurrence fit a phone's screen.
 *
 * Run on a desktop and again on a phone (the `fleet-desktop` and
 * `fleet-mobile` projects), each on records of its own.
 */

const DAY = 86_400_000;
const WEEKDAYS = 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday';

/** A day this many days from now, as `YYYY-MM-DD`. */
const dayAfter = (days: number): string =>
  new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

/** A day moved on or back by whole days, as `YYYY-MM-DD`. */
const shifted = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);

/**
 * The next last Sunday of October at least ten days off, when the clocks go
 * back in Europe/London: worked out from today, so the check never expires.
 *
 * @returns The day, as `YYYY-MM-DD`.
 */
function clocksGoBack(): string {
  const lastSundayOf = (year: number): Date => {
    const day = new Date(Date.UTC(year, 9, 31));

    day.setUTCDate(31 - day.getUTCDay());

    return day;
  };
  let year = new Date().getUTCFullYear();

  while (lastSundayOf(year).getTime() < Date.now() + 10 * DAY) {
    year++;
  }

  return lastSundayOf(year).toISOString().slice(0, 10);
}

/**
 * Makes an occurrence start half an hour ago, so its attendance can be
 * recorded, through the backend's `fleet-start` support command.
 *
 * @param occurrencePath - The occurrence's page.
 */
function startNow(occurrencePath: string): void {
  const { started } = backendSupport<{ started: number }>(
    'fleet-start',
    occurrencePath.split('/').pop()!,
  );

  expect(started, 'the occurrence was moved to have started').toBe(1);
}

/**
 * Fails when the page is wider than the screen, so it scrolls sideways.
 *
 * @param page - The page, drawn.
 * @param what - What it is, for the failure message.
 */
async function noSidewaysScroll(page: Page, what: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(scrollWidth, `${what} scrolls sideways`).toBeLessThanOrEqual(
    innerWidth,
  );
}

/**
 * Opens a scope's form for a new event, and names it and who it is for.
 *
 * @param page - The Owner's page.
 * @param scopePath - The Community's or the Fleet's page.
 * @param title - The event's title.
 * @param audience - Who it is for, as offered.
 */
async function newEvent(
  page: Page,
  scopePath: string,
  title: string,
  audience = 'Members of the Fleet',
): Promise<void> {
  await page.goto(`${scopePath}/events/new`);
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Who it is for').selectOption({ label: audience });
}

/**
 * Says how often the event happens, from when, and at what time.
 *
 * @param page - The Owner's page, on the form.
 * @param rule - How often, as offered.
 * @param day - The day, or the first day, as `YYYY-MM-DD`.
 * @param time - The start, as `HH:mm`.
 */
async function when(
  page: Page,
  rule: string,
  day: string,
  time: string,
): Promise<void> {
  await page.getByRole('radio', { name: rule, exact: true }).check();
  await page
    .getByLabel(rule === 'Once' ? 'Day' : 'Starting', { exact: true })
    .fill(day);
  await page.getByLabel('Start', { exact: true }).fill(time);
}

/**
 * Creates the event the form describes, and waits for its page.
 *
 * @param page - The Owner's page, on the form.
 * @param title - The event's title.
 * @returns The event's page.
 */
async function create(page: Page, title: string): Promise<string> {
  await page.getByRole('button', { name: 'Create the event' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  return new URL(page.url()).pathname;
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe.serial('Events, as their Owner and a member meet them', () => {
  let communityPath: string;
  let fleetName: string;
  let fleetPath: string;
  let weeklyTitle: string;
  let weeklyPath: string;
  let placeTitle: string;
  let placePath: string;
  let occurrencePath: string;

  test('the Owner registers a Community and a Fleet, and accepts a member', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const applicant = await as('applicant');
    const { people } = fleetPeople();
    const communityName = named(info, 'Events Community');

    fleetName = named(info, 'Events Fleet');

    await owner.goto('/fleets/register');
    await owner.getByLabel('Name', { exact: true }).fill(communityName);
    await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await owner.getByRole('button', { name: 'Register' }).click();
    await expect(owner).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    communityPath = new URL(owner.url()).pathname;

    await owner
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await owner.getByLabel('Name, exactly as in game').fill(fleetName);
    await owner.getByLabel('Platform').selectOption({ label: 'Windows' });
    await owner.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await owner.getByLabel('How people join').selectOption({
      label: 'By application',
    });
    await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await owner
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await owner.getByRole('button', { name: 'Register' }).click();
    await expect(owner).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    fleetPath = new URL(owner.url()).pathname;

    await owner.goto(`${fleetPath}/recruitment/settings`);
    await owner.getByLabel('Recruitment', { exact: true }).selectOption({
      label: 'Applications: somebody here decides each one',
    });
    await owner.getByRole('button', { name: 'Save' }).click();
    await expect(
      owner
        .getByText('Saved.', { exact: true })
        .or(owner.getByText('Nothing has changed to save.', { exact: true })),
    ).toBeVisible();

    await applicant.goto(fleetPath);
    await applicant.getByRole('link', { name: 'Apply to join' }).click();
    await applicant.getByLabel('Your Character').selectOption({
      label: `${people.applicant.characterName}@${people.applicant.accountHandle}`,
    });
    await applicant
      .getByRole('button', { name: 'Send the application' })
      .click();
    await expect(
      applicant.getByText(/Your application is sent\./),
    ).toBeVisible();

    await owner.goto(`${fleetPath}/recruitment/applications`);
    await owner
      .getByRole('link', { name: people.applicant.characterName })
      .first()
      .click();
    await owner.getByRole('radio', { name: 'Accept' }).check();
    await owner.getByRole('button', { name: 'Record the decision' }).click();
    await expect(owner.getByText('The decision is recorded.')).toBeVisible();
  });

  test('the Owner previews a weekly event across the clocks going back, and creates it', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const start = shifted(clocksGoBack(), -7);
    const repeated =
      'The clocks go back over this time, so it is the first of the two.';

    weeklyTitle = named(info, 'Weekly');

    await newEvent(owner, fleetPath, weeklyTitle);
    await owner.getByLabel('On the clock of').selectOption('Europe/London');
    // An hour the clocks go back over, so it happens twice that night.
    await when(owner, 'Weekly', start, '01:30');
    await owner
      .getByRole('group', { name: 'On which days' })
      .getByRole('checkbox', { name: 'Sunday' })
      .check();
    await owner.getByRole('radio', { name: 'After a number of times' }).check();
    await owner.getByLabel('How many times (1 to 500)').fill('3');

    await owner.getByRole('button', { name: 'Show what it comes to' }).click();
    await expect(
      owner.getByRole('heading', {
        name: 'Over the next year, on the Europe/London clock',
      }),
    ).toBeVisible();
    await expect(owner.getByText('3 occurrences')).toBeVisible();
    await expect(owner.getByText(repeated)).toHaveCount(1);

    weeklyPath = await create(owner, weeklyTitle);
    await expect(
      owner.getByText(
        `Every week on Sunday, from ${start}, 3 times, on the Europe/London clock`,
      ),
    ).toBeVisible();
    await expect(owner.getByText(repeated)).toHaveCount(1);
  });

  test('the Owner creates a monthly event on the 31st, and the preview lists the months skipped', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const title = named(info, 'Monthly');

    await newEvent(owner, fleetPath, title);
    await when(owner, 'Monthly, on a day', dayAfter(1), '20:00');
    await owner.getByLabel('On the day of the month (1 to 31)').fill('31');
    await owner.getByRole('button', { name: 'Show what it comes to' }).click();
    await expect(
      owner.getByText(/Skipped, having no such day: /),
    ).toBeVisible();

    await create(owner, title);
    await expect(
      owner.getByText(/Every month on the 31st, from/),
    ).toBeVisible();
  });

  test('a Community’s chosen audience offers its Fleets, and a Fleet’s offers roles only', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const title = named(info, 'Daily');
    const chosen = 'Chosen Fleets and roles';

    await newEvent(owner, communityPath, title, chosen);
    await expect(
      owner.getByRole('group', { name: 'Chosen roles' }),
    ).toBeVisible();
    await owner
      .getByRole('group', { name: 'Chosen Fleets' })
      .getByRole('checkbox', { name: fleetName })
      .check();
    // Every day for a week, so the Community page has more than five ahead.
    await when(owner, 'Weekly', dayAfter(1), '21:00');
    for (const day of WEEKDAYS.split(' ')) {
      await owner
        .getByRole('group', { name: 'On which days' })
        .getByRole('checkbox', { name: day })
        .check();
    }
    await owner.getByRole('radio', { name: 'After a number of times' }).check();
    await owner.getByLabel('How many times (1 to 500)').fill('7');
    await create(owner, title);
    await expect(owner.getByText(chosen)).toBeVisible();

    await newEvent(owner, fleetPath, named(info, 'Unsaved'), chosen);
    await expect(
      owner.getByRole('group', { name: 'Chosen roles' }),
    ).toBeVisible();
    await expect(
      owner.getByRole('group', { name: 'Chosen Fleets' }),
    ).toHaveCount(0);
  });

  test('the Community page lists the next five of its events', async ({
    as,
  }, info) => {
    const title = named(info, 'Daily');

    // The Owner, and the member of the Fleet the event was chosen for.
    for (const page of [await as('owner'), await as('applicant')]) {
      await page.goto(communityPath);
      await expect(
        page
          .getByRole('region', { name: 'Events', exact: true })
          .getByRole('link', { name: title }),
      ).toHaveCount(5);
    }
  });

  test('the Owner schedules an event with one place', async ({ as }, info) => {
    const owner = await as('owner');

    placeTitle = named(info, 'One place');

    await newEvent(owner, fleetPath, placeTitle);
    await when(owner, 'Once', dayAfter(1), '20:00');
    await owner.getByLabel('Minutes long (5 to 1440)').fill('60');
    await owner
      .getByLabel('Places for Going (1 to 1000; empty for no limit)')
      .fill('1');
    placePath = await create(owner, placeTitle);
    await expect(owner.getByText('1, then a waitlist')).toBeVisible();
  });

  test('an event for Officers is hidden from a plain member', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const title = named(info, 'Officers only');

    await newEvent(
      owner,
      fleetPath,
      title,
      'The Owner, Admins and Officers of the Fleet',
    );
    await when(owner, 'Once', dayAfter(1), '20:00');
    await create(owner, title);

    // Both on the same day, so the member's agenda for that month shows one
    // and not the other.
    await member.goto(
      `${fleetPath}/events?view=agenda&month=${dayAfter(1).slice(0, 7)}`,
    );
    await expect(member.getByRole('link', { name: placeTitle })).toBeVisible();
    await expect(member.getByRole('link', { name: title })).toHaveCount(0);
  });

  test('the member answers Going as their Character, takes the place, and sees it on their dashboard', async ({
    as,
  }) => {
    const member = await as('applicant');
    const { applicant } = fleetPeople().people;

    await member.goto(placePath);
    await member.getByLabel('As which Character (optional)').selectOption({
      label: `${applicant.characterName}@${applicant.accountHandle}`,
    });
    await member.getByRole('button', { name: 'Going', exact: true }).click();
    await expect(
      member.getByText('You are going, with a place.'),
    ).toBeVisible();

    await member
      .getByRole('region', { name: 'What lies ahead' })
      .getByRole('link')
      .first()
      .click();
    await expect(member).toHaveURL(/\/occurrences\/[^/]+$/);
    occurrencePath = new URL(member.url()).pathname;
    await expect(
      member.getByText(
        new RegExp(`${applicant.username}, as ${applicant.characterName}`),
      ),
    ).toBeVisible();

    await member.goto('/dashboard/fleets');
    await expect(
      member
        .getByRole('region', { name: 'Your upcoming events' })
        .getByRole('link', { name: placeTitle }),
    ).toBeVisible();
  });

  test('the next Going waits in line, and withdrawing promotes them', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');

    await owner.goto(placePath);
    await expect(
      owner.getByText(
        'Every place is taken, so answering Going puts you on the waitlist.',
      ),
    ).toBeVisible();
    await owner.getByRole('button', { name: 'Going', exact: true }).click();
    await expect(
      owner.getByText(/waiting for a place: 1 in line/),
    ).toBeVisible();

    await member.goto(placePath);
    await member.getByRole('button', { name: 'Take my answer back' }).click();
    await expect(member.getByText('You have not answered.')).toBeVisible();

    await owner.reload();
    await expect(owner.getByText('You are going, with a place.')).toBeVisible();
  });

  test('Maybe and Can’t go hold no place', async ({ as }) => {
    const owner = await as('owner');
    const member = await as('applicant');

    await member.goto(placePath);
    await member.getByRole('button', { name: 'Maybe', exact: true }).click();
    await expect(
      member.getByText('You might go. Maybe holds no place.'),
    ).toBeVisible();
    await expect(member.getByText('1 going · 1 maybe')).toBeVisible();

    await member.getByRole('button', { name: 'Can’t go', exact: true }).click();
    await expect(member.getByText('You can’t go.')).toBeVisible();
    await expect(member.getByText('1 going · 0 maybe')).toBeVisible();

    await owner.goto(placePath);
    await expect(owner.getByText('You are going, with a place.')).toBeVisible();

    // Without an answer, so the attendance sheet lists them among the
    // members who gave none.
    await member.getByRole('button', { name: 'Take my answer back' }).click();
    await expect(member.getByText('You have not answered.')).toBeVisible();
  });

  test('the member asks to be reminded, stops, and asks again', async ({
    as,
  }) => {
    const member = await as('applicant');
    const reminders = member.getByRole('group', { name: 'Remind me' });
    const lead = (name: string) =>
      reminders.getByRole('checkbox', { name, exact: true });
    // Waits for the server, since the page looks the same before and after.
    const press = async (name: string): Promise<void> => {
      const answered = member.waitForResponse(
        response => response.url().endsWith('/reminders') && response.ok(),
      );

      await reminders.getByRole('button', { name }).click();
      await answered;
    };

    await member.goto(weeklyPath);
    await lead('An hour before').check();
    await press('Save reminders');
    await member.reload();
    await expect(lead('An hour before')).toBeChecked();

    await lead('An hour before').uncheck();
    await press('Stop reminding me');
    await member.reload();
    await expect(lead('An hour before')).not.toBeChecked();

    // Each lead on its own, then the one the member keeps.
    await lead('15 minutes before').check();
    await press('Save reminders');
    await member.reload();
    await expect(lead('15 minutes before')).toBeChecked();
    await lead('15 minutes before').uncheck();

    // Asked again, so the member is told of the changes that follow.
    await lead('A day before').check();
    await press('Save reminders');
    await member.reload();
    await expect(lead('A day before')).toBeChecked();
    await expect(lead('15 minutes before')).not.toBeChecked();
  });

  test('the Owner moves one occurrence and cancels another, each asked first', async ({
    as,
  }) => {
    const owner = await as('owner');
    const ahead = owner.getByRole('region', { name: 'What lies ahead' });

    await owner.goto(weeklyPath);
    await ahead.getByRole('button', { name: 'Move this one' }).first().click();

    const move = owner.getByRole('form', { name: /Move the occurrence of/ });

    // The day after the first, a week before the clocks go back.
    await move.getByLabel('New day').fill(shifted(clocksGoBack(), -6));
    await move.getByRole('button', { name: 'Move it' }).click();
    await expect(ahead.getByText(/Moved from/)).toBeVisible();

    await ahead.getByRole('button', { name: 'Cancel this one' }).last().click();

    const dialog = owner.getByRole('dialog');

    await expect(dialog.getByText('Cancel this occurrence?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel it' }).click();
    await expect(ahead.getByText('Cancelled', { exact: true })).toBeVisible();
  });

  test('the member is told in-app of the move and the cancellation', async ({
    as,
  }) => {
    // The outbox is read once a minute.
    test.setTimeout(300_000);

    const member = await as('applicant');

    await member.goto('/notifications');
    await expect(async () => {
      await member.reload();
      for (const title of [
        `${weeklyTitle} has moved`,
        `${weeklyTitle} is cancelled`,
      ]) {
        await expect(member.getByText(title, { exact: true })).toBeVisible({
          timeout: 5_000,
        });
      }
    }).toPass({ timeout: 240_000, intervals: [10_000] });
  });

  test('once it has started, the sheet lists who answered, then the other members, and records who came', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const { people } = fleetPeople();

    startNow(occurrencePath);
    await owner.goto(occurrencePath);

    const sheet = owner.getByRole('region', { name: 'Who came' });
    const record = (name: string) =>
      sheet.getByRole('button', { name, exact: true });

    await expect(sheet.getByRole('rowheader')).toHaveText([
      people.owner.username,
      people.applicant.username,
    ]);

    await sheet.getByLabel('Find by name').fill(people.applicant.username);
    await expect(sheet.getByRole('rowheader')).toHaveText([
      people.applicant.username,
    ]);
    await record(`${people.applicant.username} came`).click();
    await expect(record(`${people.applicant.username} came`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await sheet.getByLabel('Find by name').fill('');
    await record(`${people.owner.username} did not come`).click();
    await expect(
      record(`${people.owner.username} did not come`),
    ).toHaveAttribute('aria-pressed', 'true');

    await member.goto(occurrencePath);
    await expect(
      member.getByText(/You were recorded as having come/),
    ).toBeVisible();
  });

  test('the Owner reads attendance by person, and a member, once shown it, counts only', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const { people } = fleetPeople();
    const reportPath = `${fleetPath}/reports?report=attendance`;
    const byPerson = (page: Page) =>
      page.getByRole('table', { name: /Each person recorded/ });

    await owner.goto(reportPath);
    await expect(
      byPerson(owner).getByRole('row', {
        name: new RegExp(people.applicant.username),
      }),
    ).toBeVisible();

    const attendance = owner
      .getByRole('region', { name: 'Who sees each report' })
      .getByRole('row')
      .filter({ hasText: 'Attendance' });
    const shownTo = attendance.getByLabel('Shown to');
    const save = attendance.getByRole('button', { name: 'Save', exact: true });

    await shownTo.selectOption({ label: 'The Fleet’s members, counts only' });
    await save.click();
    await expect(save).toBeDisabled();
    await owner.reload();
    await expect(shownTo).toHaveValue('FLEET_MEMBERS');

    await member.goto(reportPath);
    await expect(member.getByText(/You are shown counts only\./)).toBeVisible();
    await expect(
      member.getByRole('table', {
        name: /Each occurrence of this Fleet’s own events/,
      }),
    ).toBeVisible();
    await expect(byPerson(member)).toHaveCount(0);
  });

  test('recruitment is counted by month and route, and anyone shown it sees counts only', async ({
    as,
    anonymous,
  }) => {
    const owner = await as('owner');
    const visitor = await anonymous();
    const reportPath = `${fleetPath}/reports?report=recruitment`;
    const applications = (page: Page) =>
      page
        .getByRole('table', {
          name: 'Month by month, how each way of joining went',
        })
        .getByRole('row')
        .filter({ hasText: 'Applications' })
        .getByRole('cell');

    // One application, accepted: Received, Accepted, Declined, Withdrawn,
    // Lapsed and Pending.
    await owner.goto(reportPath);
    await expect(applications(owner)).toHaveText([
      'Applications',
      '1',
      '1',
      '0',
      '0',
      '0',
      '0',
      /./,
    ]);

    const audiences = owner.getByRole('region', {
      name: 'Who sees each report',
    });

    await expect(audiences).toContainText(
      'the Community’s followers and anyone else see its counts only, never a name.',
    );

    const recruitment = audiences
      .getByRole('row')
      .filter({ hasText: 'Recruitment' });
    const shownTo = recruitment.getByLabel('Shown to');
    const save = recruitment.getByRole('button', { name: 'Save', exact: true });

    await expect(shownTo.getByRole('option')).toContainText([
      'The Community’s followers, counts only',
      'Anyone, counts only',
    ]);
    await shownTo.selectOption({ label: 'Anyone, counts only' });
    await save.click();
    await expect(save).toBeDisabled();

    // A figure from one to four is never given exactly to a counts-only
    // reader.
    await visitor.goto(reportPath);
    await expect(
      visitor.getByText(/You are shown counts only\./),
    ).toBeVisible();
    await expect(applications(visitor).nth(1)).toHaveText('< 5');
    await expect(applications(visitor).nth(2)).toHaveText('< 5');
  });

  test('the Owner changes an event from now on, cancels it, and reads its change log', async ({
    as,
  }) => {
    const owner = await as('owner');

    await owner.goto(weeklyPath);
    await owner.getByRole('link', { name: 'Change from now on' }).click();
    await expect(owner.getByLabel('Title')).toHaveValue(weeklyTitle);
    await expect(owner.getByText(/Changes apply from now on\./)).toBeVisible();
    // The title stays, so the notices written from it keep their words.
    await owner.getByLabel('Minutes long (5 to 1440)').fill('90');
    await owner.getByRole('button', { name: 'Save from now on' }).click();
    await expect(
      owner.getByRole('heading', { name: weeklyTitle }),
    ).toBeVisible();
    await expect(owner.getByText('90 minutes', { exact: true })).toBeVisible();

    await owner.getByRole('button', { name: 'Cancel the event' }).click();

    const dialog = owner.getByRole('dialog');

    await expect(dialog.getByText('Cancel this event?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel the event' }).click();
    await expect(
      owner.getByText('This event was cancelled. Nothing of it lies ahead.'),
    ).toBeVisible();

    await owner.getByRole('button', { name: 'Show the change log' }).click();

    const log = owner
      .getByRole('region', { name: 'Change log' })
      .getByRole('listitem');

    for (const line of [
      /— Created/,
      /— One occurrence moved/,
      /— One occurrence cancelled/,
      /— Changed from then on/,
      /— Cancelled\s+by/,
    ]) {
      await expect(log.filter({ hasText: line })).toHaveCount(1);
    }
  });

  test('the editor and an occurrence never scroll sideways', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    // The phone project is narrow already; the desktop one is narrowed too.
    const screens = info.project.name.includes('mobile')
      ? [null]
      : [null, { width: 375, height: 812 }];

    for (const screen of screens) {
      const at = screen === null ? 'as drawn' : `at ${screen.width}px`;

      if (screen !== null) {
        await owner.setViewportSize(screen);
      }

      // With the widest choices open.
      await newEvent(owner, fleetPath, 'Unsaved', 'Chosen Fleets and roles');
      await owner.getByRole('radio', { name: 'Weekly' }).check();
      await expect(
        owner.getByRole('group', { name: 'On which days' }),
      ).toBeVisible();
      await noSidewaysScroll(owner, `The editor, ${at},`);

      await owner.goto(occurrencePath);
      await expect(
        owner.getByRole('region', { name: 'Who came' }).getByRole('table'),
      ).toBeVisible();
      await noSidewaysScroll(owner, `The occurrence, ${at},`);
    }
  });
});
