import { expect, Page } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The whole of Fleet Community, as its people meet it (FC-044): an Owner
 * registers a Community, a Fleet, an Armada and a Fleet nobody runs; imports
 * a roster; opens applications and accepts an applicant; schedules an event
 * the new member answers; the two chat; the Owner reports a message, a site
 * admin decides the report, and the Owner suspends the member.
 *
 * Run on a desktop and again on a phone (the `fleet-desktop` and
 * `fleet-mobile` projects), each on records of its own.
 */

/** The basic roster fixture's rows, as the game writes them. */
const ROSTER_ROWS = [
  'Character Name,Account Handle,Level,Class,Guild Rank,Contribution Total,Join Date,Rank Change Date,Last Active Date,Status,Public Comment,Public Comment Last Edit Date',
  'Aria Venn,@fixture001,65,Starfleet Tactical Officer,Member,120500,3/4/2023 8:15:00pm,6/1/2023 9:00:00am,1/1/2024 11:45:00am,"Offline","Happy to run TFOs at weekends",5/2/2023 7:30:00pm',
  'Dax Orlan,@fixture002,50,Starfleet Engineering Officer,Recruit,0,12/20/2023 2:05:00am,,12/31/2023 10:00:00pm,"Offline","",',
];

/**
 * Follows the same steps on a desktop and on a phone, where the page's own
 * tabs may sit behind a menu but keep their names.
 *
 * @param page - The page.
 * @param name - The tab's name.
 */
async function openTab(page: Page, name: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Fleet sections' })
    .last()
    .getByRole('link', { name, exact: true })
    .click();
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe
  .serial('From registering a Community to moderating its chat', () => {
  let communityName: string;
  let communityPath: string;
  let fleetName: string;
  let fleetPath: string;
  let message: string;

  test('the Owner registers a Community', async ({ as }, info) => {
    const page = await as('owner');

    communityName = named(info, 'Community');

    await page.goto('/fleets/register');
    await page.getByLabel('Name', { exact: true }).fill(communityName);
    await page.getByLabel('How people join').selectOption({
      label: 'By application',
    });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    await expect(
      page.getByRole('heading', { name: communityName }),
    ).toBeVisible();
    communityPath = new URL(page.url()).pathname;
  });

  test('the Owner registers a Fleet and an Armada into it', async ({
    as,
  }, info) => {
    const page = await as('owner');

    fleetName = named(info, 'Fleet');

    await page.goto(communityPath);
    await page
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await page.getByLabel('Name, exactly as in game').fill(fleetName);
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await page.getByLabel('How people join').selectOption({
      label: 'By application',
    });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    fleetPath = new URL(page.url()).pathname;

    await page.goto(communityPath);
    await page
      .getByRole('link', { name: `Register an Armada into ${communityName}` })
      .click();
    await page
      .getByLabel('Name, exactly as in game')
      .fill(named(info, 'Armada'));
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/armadas\/windows\/[^/]+$/);
  });

  test('the Owner confirms a Fleet nobody here runs', async ({ as }, info) => {
    const page = await as('owner');

    await page.goto('/fleets/register-standalone');
    await page
      .getByLabel('Name, exactly as in game')
      .fill(named(info, 'Unrun Fleet'));
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await expect(
      page.getByText('Nothing else answers to that name on that platform.'),
    ).toBeVisible();
    await page
      .getByLabel(
        'I understand that this record will belong to no Community, and that nobody will be able to change or close it afterwards.',
      )
      .check();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page).toHaveURL(
      /\/fleets\/communities\/standalone\/fleets\/windows\/[^/]+$/,
    );
  });

  test('the Owner checks a roster export and imports it', async ({ as }) => {
    const page = await as('owner');

    await page.goto(fleetPath);
    await page
      .getByRole('link', {
        name: `Check a roster export for ${fleetName}, and then import it`,
      })
      .click();
    await page.getByLabel('The export, as the game wrote it').setInputFiles({
      name: `${fleetName}_20240101-120000.Csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(`${ROSTER_ROWS.join('\r\n')}\r\n`, 'utf8'),
    });
    await page.getByLabel('The clock it was taken on').selectOption('UTC');
    await page.getByRole('button', { name: 'Check this export' }).click();

    await expect(page.getByText('Ready to import')).toBeVisible();
    await expect(page.getByText(/reads as 2 members/)).toBeVisible();

    await page.getByRole('button', { name: 'Import this export' }).click();

    await expect(page).toHaveURL(/\/investigate\/imports\/[^/]+$/);
    // Scanned by the local worker's clamd, then read into the roster.
    await expect(page.getByText('Imported', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
  });

  test('the Owner takes applications, and accepts the applicant', async ({
    as,
  }) => {
    const owner = await as('owner');
    const applicant = await as('applicant');
    const { people } = fleetPeople();

    await owner.goto(`${fleetPath}/recruitment/settings`);
    await owner.getByLabel('Recruitment', { exact: true }).selectOption({
      label: 'Applications: somebody here decides each one',
    });
    await owner.getByRole('button', { name: 'Save' }).click();
    // Exact strings, not an anchored regex: a regex is tried against the
    // untrimmed text, which the template pads with whitespace.
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

  test('the Owner schedules an event, and the new member takes a place', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const tomorrow = new Date(Date.now() + 24 * 3_600_000)
      .toISOString()
      .slice(0, 10);
    const title = named(info, 'Event');

    await owner.goto(fleetPath);
    await openTab(owner, 'Events');
    await owner.getByRole('link', { name: 'New event' }).click();
    await owner.getByLabel('Title').fill(title);
    await owner
      .getByLabel('Who it is for')
      .selectOption({ label: 'Members of the Fleet' });
    await owner.getByRole('radio', { name: 'Once' }).check();
    await owner.getByLabel('Day', { exact: true }).fill(tomorrow);
    await owner.getByLabel('Start').fill('20:00');
    await owner.getByLabel('Minutes long (5 to 1440)').fill('60');
    await owner
      .getByLabel('Places for Going (1 to 1000; empty for no limit)')
      .fill('1');
    await owner.getByRole('button', { name: 'Create the event' }).click();
    await expect(owner.getByRole('heading', { name: title })).toBeVisible();

    const eventPath = new URL(owner.url()).pathname;

    await member.goto(eventPath);
    await member.getByRole('button', { name: 'Going' }).first().click();
    await expect(
      member.getByText('You are going, with a place.'),
    ).toBeVisible();
  });

  test('the member and the Owner chat in the Fleet’s General channel', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const member = await as('applicant');

    message = named(info, 'hail');

    await owner.goto(fleetPath);
    await openTab(owner, 'Chat');
    await member.goto(fleetPath);
    await openTab(member, 'Chat');

    await member.getByLabel('Message # General').fill(message);
    await member.getByRole('button', { name: 'Send' }).click();

    await expect(
      member
        .getByRole('log', { name: 'Messages in # General' })
        .getByText(message),
    ).toBeVisible();
    // Live, over the socket, without reloading.
    await expect(
      owner
        .getByRole('log', { name: 'Messages in # General' })
        .getByText(message),
    ).toBeVisible();
  });

  test('the Owner reports the message, and a site admin resolves the report', async ({
    as,
  }) => {
    const owner = await as('owner');
    const admin = await as('admin');
    const { people } = fleetPeople();

    await owner.goto(fleetPath);
    await openTab(owner, 'Chat');
    // By keyboard: the message's actions are reachable, and appear once one
    // of them has focus.
    const reportButton = owner
      .getByRole('button', {
        name: `Report the message from ${people.applicant.username}`,
      })
      .last();

    await reportButton.focus();
    await expect
      .poll(async () => (await reportButton.boundingBox())?.width ?? 0)
      .toBeGreaterThan(10);
    await owner.keyboard.press('Enter');

    const report = owner.getByRole('dialog');

    await report.getByLabel('Reason').selectOption({ label: 'Spam or scams' });
    await report.getByRole('button', { name: 'Send report' }).click();
    await expect(
      owner.getByText('Thanks, a site admin will look at it.'),
    ).toBeVisible();
    await owner.getByRole('button', { name: 'OK' }).click();

    await admin.goto('/admin/chat-reports');
    await admin.getByLabel('Status').selectOption({ label: 'Open' });

    const entry = admin
      .getByRole('article')
      .filter({ hasText: people.applicant.username })
      .first();

    // By keyboard: an icon-only button has no size here, where the icon kit
    // is not configured.
    await entry.getByRole('button', { name: 'Resolve' }).focus();
    await admin.keyboard.press('Enter');

    const decision = admin.getByRole('dialog');

    await decision
      .getByLabel('What was found or done, and why')
      .fill('FC-044 journey: a test report, resolved.');
    await decision.getByRole('button', { name: 'Resolve' }).click();
    await expect(admin.getByText('The report was resolved.')).toBeVisible();
  });

  test('the Owner suspends the member, with a reason', async ({ as }) => {
    const owner = await as('owner');
    const { people } = fleetPeople();

    await owner.goto(`${fleetPath}/recruitment/members`);
    await owner
      .getByRole('row', { name: new RegExp(people.applicant.username) })
      .getByRole('button', { name: 'Suspend…' })
      .click();

    const form = owner.getByRole('form', { name: 'Suspend a member' });

    await form.getByLabel('Reason').fill('FC-044 journey: a test suspension.');
    await form.getByRole('button', { name: 'Suspend' }).click();
    await expect(
      owner.getByText(/They are suspended: they keep their membership/),
    ).toBeVisible();
  });
});
