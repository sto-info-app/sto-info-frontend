import { randomUUID } from 'node:crypto';

import { Browser, expect, Locator, Page, TestInfo } from '@playwright/test';

import { backendSupport } from '../support/backend';
import {
  fleetBackend,
  FLEET_PEOPLE_FILE,
  fleetPeople,
  FleetRole,
  fleetStateOf,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The signed-in checks owed by FC-036, FC-037, FC-039 and FC-041, automated
 * for FC-044: a Fleet's members suspended and reinstated; a Fleet suspended
 * and reinstated, and looked into, by a site admin, beside another
 * Community's Fleet of the same name; chat evidence held, read, extended and
 * released, and a hold past its review date told to its owner; the two report
 * queues, and Reported Officers claimed, closed and dismissed; a role and an
 * override changed and an account disabled and restored, each with a reason;
 * a held export whose file expired; Storytime Moderation refusing a decision
 * without its words; Scan Diagnostics and its rescan campaigns; and the
 * Security Log, which lists all of it, a page at a time.
 *
 * The hold review and the export's expiry are the backend's scheduled jobs,
 * run on demand by its support script with only this run's records moved to
 * their dates.
 *
 * Roster erasure (FC-038) and private images (FC-040) are left out: their
 * keys are not configured locally.
 */

/** The basic roster fixture's rows, as the game writes them. */
const ROSTER_ROWS = [
  'Character Name,Account Handle,Level,Class,Guild Rank,Contribution Total,Join Date,Rank Change Date,Last Active Date,Status,Public Comment,Public Comment Last Edit Date',
  'Aria Venn,@fixture001,65,Starfleet Tactical Officer,Member,120500,3/4/2023 8:15:00pm,6/1/2023 9:00:00am,1/1/2024 11:45:00am,"Offline","Happy to run TFOs at weekends",5/2/2023 7:30:00pm',
  'Dax Orlan,@fixture002,50,Starfleet Engineering Officer,Recruit,0,12/20/2023 2:05:00am,,12/31/2023 10:00:00pm,"Offline","",',
];

/** The site administration pages that must never scroll sideways. */
const ADMIN_PAGES = [
  '/admin/chat-reports',
  '/admin/reports',
  '/admin/holds',
  '/admin/fleet-investigations',
  '/admin/fleet-disputes',
  '/admin/roster-erasures',
  '/admin/scan-diagnostics',
  '/admin/security-log',
  '/admin/users',
  '/admin/permissions',
];

/** Where the API is. */
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000';

/** What the investigating site admin is told on every page they read. */
const READ_ONLY_NOTE = 'You are looking in as a site admin';

/**
 * Opens one of the page's own tabs, which on a phone may sit behind a menu.
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

/**
 * Presses a record's action by keyboard: an icon-only button has no size
 * here, where the icon kit is not configured.
 *
 * @param page - The page.
 * @param button - The button.
 */
async function press(page: Page, button: Locator): Promise<void> {
  await button.focus();
  await page.keyboard.press('Enter');
}

/**
 * Answers the dialog that asks why, and waits for it to close.
 *
 * @param page - The page.
 * @param label - The field's label.
 * @param text - The answer.
 * @param confirm - The button that confirms.
 */
async function answer(
  page: Page,
  label: string,
  text: string,
  confirm: string,
): Promise<void> {
  const dialog = page.getByRole('dialog');

  await dialog.getByLabel(label).fill(text);
  await dialog.getByRole('button', { name: confirm, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

/**
 * Opens a page and waits until it has settled.
 *
 * @param page - The page.
 * @param path - Where.
 */
async function settle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main'), `${path} drew its page`).toBeVisible();
}

/**
 * Signs somebody in again through the login form and keeps their new
 * session, for the journeys after this one: disabling an account signs it out
 * everywhere.
 *
 * @param browser - The browser.
 * @param info - The test, for the address of the site.
 * @param role - Who.
 */
async function signInAgain(
  browser: Browser,
  info: TestInfo,
  role: FleetRole,
): Promise<void> {
  const person = fleetPeople().people[role];
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
  });
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByLabel('Email').fill(person.email);
  await page.getByLabel('Password').fill(person.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await context.storageState({ path: fleetStateOf(role) });
  await context.close();
}

/**
 * Holds the rescan campaigns' queue, or lets it go, so that a campaign waits
 * where a site admin can pause, resume and cancel it before its first batch
 * is staged. See the backend's `fleet-rescan-queue`.
 *
 * @param state - Which.
 */
function rescanQueue(state: 'pause' | 'resume'): void {
  backendSupport('fleet-rescan-queue', state);
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe.serial('Signed-in checks owed to site admins and Owners', () => {
  let tag: string;
  let communityName: string;
  let communityPath: string;
  let fleetName: string;
  let fleetPath: string;
  let messages: [string, string];
  let secondCommunityName: string;
  let storyTitle: string;
  let storySlug: string;

  /** A reason, recognisably this run's. */
  const why = (what: string): string => `${tag}: ${what}`;

  test('the Owner registers a Community and a Fleet that takes applications', async ({
    as,
  }, info) => {
    const page = await as('owner');

    tag = named(info, 'owed');
    communityName = named(info, 'Owed Community');
    fleetName = named(info, 'Owed Fleet');
    messages = [named(info, 'owed one'), named(info, 'owed two')];

    await page.goto('/fleets/register');
    await page.getByLabel('Name', { exact: true }).fill(communityName);
    await page
      .getByLabel('How people join')
      .selectOption({ label: 'By application' });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    communityPath = new URL(page.url()).pathname;

    await page
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await page.getByLabel('Name, exactly as in game').fill(fleetName);
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await page
      .getByLabel('How people join')
      .selectOption({ label: 'By application' });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    fleetPath = new URL(page.url()).pathname;

    await page.goto(`${fleetPath}/recruitment/settings`);
    await page.getByLabel('Recruitment', { exact: true }).selectOption({
      label: 'Applications: somebody here decides each one',
    });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page
        .getByText('Saved.', { exact: true })
        .or(page.getByText('Nothing has changed to save.', { exact: true })),
    ).toBeVisible();
  });

  test('the Owner imports a roster, for a site admin to look into', async ({
    as,
  }) => {
    const page = await as('owner');

    await page.goto(`${fleetPath}/import`);
    await page.getByLabel('The export, as the game wrote it').setInputFiles({
      name: `${fleetName}_20240101-120000.Csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(`${ROSTER_ROWS.join('\r\n')}\r\n`, 'utf8'),
    });
    await page.getByLabel('The clock it was taken on').selectOption('UTC');
    await page.getByRole('button', { name: 'Check this export' }).click();
    await expect(page.getByText('Ready to import')).toBeVisible();
    await page.getByRole('button', { name: 'Import this export' }).click();
    await expect(page.getByText('Imported', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
  });

  test('the applicant and the future Officer apply, and the Owner accepts both', async ({
    as,
  }) => {
    const owner = await as('owner');
    const { people } = fleetPeople();

    for (const role of ['applicant', 'officer'] as const) {
      const page = await as(role);

      await page.goto(fleetPath);
      await page.getByRole('link', { name: 'Apply to join' }).click();
      await page.getByLabel('Your Character').selectOption({
        label: `${people[role].characterName}@${people[role].accountHandle}`,
      });
      await page.getByRole('button', { name: 'Send the application' }).click();
      await expect(page.getByText(/Your application is sent\./)).toBeVisible();

      await owner.goto(`${fleetPath}/recruitment/applications`);
      await owner
        .getByRole('link', { name: people[role].characterName })
        .first()
        .click();
      await owner.getByRole('radio', { name: 'Accept' }).check();
      await owner.getByRole('button', { name: 'Record the decision' }).click();
      await expect(owner.getByText('The decision is recorded.')).toBeVisible();
    }
  });

  test('the member writes twice, and the Owner reports both messages and the member', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const { people } = fleetPeople();

    await member.goto(fleetPath);
    await openTab(member, 'Chat');

    for (const message of messages) {
      await member.getByLabel('Message # General').fill(message);
      await member.getByRole('button', { name: 'Send' }).click();
      await expect(
        member
          .getByRole('log', { name: 'Messages in # General' })
          .getByText(message),
      ).toBeVisible();
    }

    await owner.goto(fleetPath);
    await openTab(owner, 'Chat');

    for (const [index, message] of messages.entries()) {
      const flag = owner
        .getByRole('log', { name: 'Messages in # General' })
        .getByRole('listitem')
        .filter({ hasText: message })
        .getByRole('button', {
          name: `Report the message from ${people.applicant.username}`,
        });

      // By keyboard: the message's actions appear once one has focus.
      await flag.focus();
      await expect
        .poll(async () => (await flag.boundingBox())?.width ?? 0)
        .toBeGreaterThan(10);
      await owner.keyboard.press('Enter');

      const report = owner.getByRole('dialog');

      await report
        .getByLabel('Reason')
        .selectOption({ label: 'Spam or scams' });
      await report.getByLabel('What is wrong').fill(why(`report ${index + 1}`));
      await report.getByRole('button', { name: 'Send report' }).click();
      await expect(
        owner.getByText('Thanks, a site admin will look at it.'),
      ).toBeVisible();
      await owner.getByRole('button', { name: 'OK' }).click();
    }

    await owner.goto(
      `/community/registry/profiles/${people.applicant.username}`,
    );
    await owner.getByRole('button', { name: 'Report', exact: true }).click();
    await owner
      .getByRole('dialog')
      .getByLabel('Reason')
      .selectOption({ label: 'Spam or scams' });
    await owner.getByRole('button', { name: 'Send Report' }).click();
    // The desktop run's report may still be open when the phone's is sent.
    await expect(
      owner
        .getByText('Your report has been sent to the administrators.')
        .or(owner.getByText('You have already reported this officer.')),
    ).toBeVisible();
  });

  test('the two report queues show each other’s open counts', async ({
    as,
  }) => {
    const page = await as('admin');
    const { people } = fleetPeople();

    await page.goto('/admin/chat-reports');
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: why('report 1') })
        .getByRole('link', { name: /open member reports?/ }),
    ).toBeVisible();

    await page.goto('/admin/reports');
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: people.applicant.username })
        .first()
        .getByRole('link', { name: /open chat reports?/ }),
    ).toBeVisible();
  });

  test('Reported Officers: a claim needs no reason; closing as actioned and dismissing each wait for one', async ({
    as,
  }) => {
    const admin = await as('admin');
    const { people } = fleetPeople();
    const name = people.applicant.username;

    // Two more reports about the member, from people who have none open.
    for (const role of ['friend', 'officer'] as const) {
      const page = await as(role);

      await page.goto(`/community/registry/profiles/${name}`);
      await page.getByRole('button', { name: 'Report', exact: true }).click();

      const dialog = page.getByRole('dialog');

      await dialog
        .getByLabel('Reason')
        .selectOption({ label: 'Spam or scams' });
      await dialog
        .getByLabel('What happened (optional)')
        .fill(why(`${role}’s report`));
      await dialog.getByRole('button', { name: 'Send Report' }).click();
      await expect(
        page.getByText('Your report has been sent to the administrators.'),
      ).toBeVisible();
    }

    const status = admin.getByLabel('Status', { exact: true });
    const report = (role: string) =>
      admin.getByRole('article').filter({ hasText: why(`${role}’s report`) });

    await admin.goto('/admin/reports');
    await press(
      admin,
      report('friend').getByRole('button', { name: 'Mark as under review' }),
    );
    await expect(
      admin.getByText(`Report about ${name} marked as under review.`),
    ).toBeVisible();
    await expect(admin.getByRole('dialog')).toHaveCount(0);

    for (const [role, filter, action, confirm, reason, done] of [
      [
        'friend',
        'Under review',
        'Close as actioned',
        'Close',
        why('close the member report'),
        `Report about ${name} closed as actioned.`,
      ],
      [
        'officer',
        'Open',
        'Dismiss report',
        'Dismiss',
        why('dismiss the member report'),
        `Report about ${name} dismissed.`,
      ],
    ]) {
      await status.selectOption({ label: filter });
      await press(admin, report(role).getByRole('button', { name: action }));

      const dialog = admin.getByRole('dialog');
      const button = dialog.getByRole('button', { name: confirm, exact: true });

      await expect(button).toBeDisabled();
      await dialog.getByLabel('Reason').fill(reason);
      await expect(button).toBeEnabled();
      await button.click();
      await expect(admin.getByText(done)).toBeVisible();
    }
  });

  test('from Chat Reports, a site admin holds the evidence and the author’s messages', async ({
    as,
  }) => {
    const page = await as('admin');
    const { people } = fleetPeople();

    await page.goto('/admin/chat-reports');

    const entry = page
      .getByRole('article')
      .filter({ hasText: why('report 1') });

    await press(page, entry.getByRole('button', { name: 'Show evidence' }));
    await entry.getByRole('button', { name: 'Hold this evidence…' }).click();
    await answer(page, 'Reason', why('hold the evidence'), 'Hold');
    await expect(page.getByText('Its evidence is held.')).toBeVisible();
    await expect(
      entry.getByRole('link', { name: 'see Moderation Holds' }),
    ).toBeVisible();

    await press(
      page,
      entry.getByRole('button', {
        name: `Hold ${people.applicant.username}’s messages`,
      }),
    );
    await answer(page, 'Reason', why('hold their messages'), 'Hold');
    // A retry finds the first attempt's hold still in force.
    await expect(
      page
        .getByText('Their messages are held.')
        .or(page.getByText('A hold on that is already in force.')),
    ).toBeVisible();
  });

  test('a hold is read with a purpose, extended and released, and its log shows each', async ({
    as,
  }) => {
    const page = await as('admin');
    const { people } = fleetPeople();

    await page.goto('/admin/holds');
    await page
      .getByLabel('Show', { exact: true })
      .selectOption({ label: 'All holds' });

    const hold = page
      .getByRole('article')
      .filter({ hasText: why('hold the evidence') });
    const releases = hold
      .locator('.admin-record-detail')
      .filter({ hasText: 'Released automatically' });

    await expect(releases).toContainText(', unless extended');

    await press(page, hold.getByRole('button', { name: 'Read what it keeps' }));
    await answer(page, 'Purpose', why('read the evidence'), 'Read');
    await expect(hold).toContainText(`Read for: ${why('read the evidence')}`);
    await expect(hold.getByText(messages[0])).toBeVisible();

    await press(page, hold.getByRole('button', { name: 'Extend' }));
    await answer(page, 'Reason', why('extend the hold'), 'Extend');
    await expect(
      page.getByText('The hold’s review date has moved.'),
    ).toBeVisible();

    await press(page, hold.getByRole('button', { name: 'Release' }));
    await answer(page, 'Reason', why('release the hold'), 'Release');
    await expect(page.getByText('The hold is released.')).toBeVisible();

    for (const [action, reason] of [
      ['Placed', why('hold the evidence')],
      ['Read', why('read the evidence')],
      ['Extended', why('extend the hold')],
      ['Released', why('release the hold')],
    ]) {
      await expect(
        hold.getByRole('listitem').filter({ hasText: reason }),
        action,
      ).toContainText(action);
    }

    // The member's own hold goes too, so the next run can place another.
    await page
      .getByLabel('Show', { exact: true })
      .selectOption({ label: 'In force' });
    await press(
      page,
      page
        .getByRole('article')
        .filter({ hasText: 'Everything a member wrote in chat' })
        .filter({ hasText: people.applicant.username })
        .first()
        .getByRole('button', { name: 'Release' }),
    );
    await answer(page, 'Reason', why('release their messages'), 'Release');
    await expect(page.getByText('The hold is released.')).toBeVisible();
  });

  test('a hold past its review date tells its owner, and its log says so', async ({
    as,
  }) => {
    // Starting the backend to run the review takes a minute or two.
    test.setTimeout(420_000);

    const page = await as('admin');

    await page.goto('/admin/chat-reports');

    const entry = page
      .getByRole('article')
      .filter({ hasText: why('report 2') });

    await press(page, entry.getByRole('button', { name: 'Show evidence' }));
    await entry.getByRole('button', { name: 'Hold this evidence…' }).click();
    await answer(page, 'Reason', why('hold until its review'), 'Hold');
    await expect(page.getByText('Its evidence is held.')).toBeVisible();

    // The 05:03 review, run now, with this hold's date a minute gone.
    const { moved } = backendSupport<{ moved: number }>(
      'fleet-review-holds',
      tag,
    );

    expect(moved, 'holds brought to their review date').toBe(1);

    await expect(async () => {
      await page.goto('/notifications');
      await expect(
        page.getByText('Hold due for review', { exact: true }).first(),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });

    await page.goto('/admin/holds');

    const hold = page
      .getByRole('article')
      .filter({ hasText: why('hold until its review') });

    await expect(hold.getByText('Review due', { exact: true })).toBeVisible();
    await press(page, hold.getByRole('button', { name: 'Show its log' }));
    await expect(
      hold
        .getByRole('listitem')
        .filter({ hasText: 'Owner told the review is due (automatic)' }),
    ).toContainText('Its review date passed.');

    // Released, so the next run can hold the same evidence.
    await press(page, hold.getByRole('button', { name: 'Release' }));
    await answer(page, 'Reason', why('release after its review'), 'Release');
    await expect(page.getByText('The hold is released.')).toBeVisible();
  });

  test('Resolve and Dismiss each wait for a note', async ({ as }) => {
    const page = await as('admin');

    await page.goto('/admin/chat-reports');

    for (const [report, decision, done] of [
      ['report 1', 'Resolve', 'The report was resolved.'],
      ['report 2', 'Dismiss', 'The report was dismissed.'],
    ]) {
      await press(
        page,
        page
          .getByRole('article')
          .filter({ hasText: why(report) })
          .getByRole('button', { name: decision }),
      );

      const dialog = page.getByRole('dialog');
      const confirm = dialog.getByRole('button', { name: decision });

      await expect(confirm).toBeDisabled();
      await dialog
        .getByLabel('What was found or done, and why')
        .fill(why(`${decision.toLowerCase()} the report`));
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect(page.getByText(done)).toBeVisible();
    }
  });

  test('the Owner suspends a member, who is told and loses its pages, then reinstates them', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const { people } = fleetPeople();
    const row = owner.getByRole('row', {
      name: new RegExp(people.applicant.username),
    });
    const chatTab = member
      .getByRole('navigation', { name: 'Fleet sections' })
      .last()
      .getByRole('link', { name: 'Chat', exact: true });

    await owner.goto(`${fleetPath}/recruitment/members`);
    await row.getByRole('button', { name: 'Suspend…' }).click();

    const suspend = owner.getByRole('form', { name: 'Suspend a member' });

    await suspend.getByLabel('Reason').fill(why('suspend the member'));
    await suspend.getByRole('button', { name: 'Suspend' }).click();
    await expect(
      owner.getByText(/They are suspended: they keep their membership/),
    ).toBeVisible();

    await member.goto(fleetPath);
    await expect(
      member.getByText('Your membership of this Fleet is suspended.'),
    ).toBeVisible();
    await expect(chatTab).toHaveCount(0);
    await member.goto('/notifications');
    await expect(
      member.getByText(`Your membership of ${fleetName} has been suspended.`),
    ).toBeVisible();

    await row.getByRole('button', { name: 'Reinstate…' }).click();

    const reinstate = owner.getByRole('form', { name: 'Reinstate a member' });

    await reinstate.getByLabel('Reason').fill(why('reinstate the member'));
    await reinstate.getByRole('button', { name: 'Reinstate' }).click();
    await expect(
      owner.getByText('Their membership is in force again.'),
    ).toBeVisible();

    await member.goto(fleetPath);
    await expect(
      member.getByText('You are an approved member of this Fleet.'),
    ).toBeVisible();
    await expect(chatTab).toBeVisible();
    await member.goto('/notifications');
    await expect(
      member.getByText(`Your membership of ${fleetName} has been reinstated.`),
    ).toBeVisible();
  });

  test('when an Officer leaves, the Fleet’s history says their role ended', async ({
    as,
  }) => {
    const owner = await as('owner');
    const officer = await as('officer');
    const { people } = fleetPeople();

    await owner.goto(`${fleetPath}/manage/roles`);

    const appoint = owner.getByRole('form', { name: 'Appoint somebody' });

    await appoint
      .getByLabel('Person')
      .selectOption({ label: people.officer.username });
    await appoint.getByLabel('Role').selectOption({ label: 'Officer' });
    await appoint.getByRole('button', { name: 'Appoint' }).click();
    await expect(owner.getByText('Appointed.', { exact: true })).toBeVisible();

    await officer.goto(fleetPath);
    await officer.getByRole('button', { name: 'Leave this Fleet' }).click();
    await officer
      .getByRole('dialog')
      .getByRole('button', { name: 'Leave', exact: true })
      .click();
    await expect(officer).toHaveURL(/\/fleets\/applications/);

    await owner.goto(`${fleetPath}/manage/history`);
    await expect(
      owner.getByText(`${people.officer.username}’s role as an Officer ended.`),
    ).toBeVisible();
  });

  test('the Owner registers a Fleet of the same name in a second Community, and is told of the first', async ({
    as,
  }, info) => {
    const page = await as('owner');

    secondCommunityName = named(info, 'Owed Second Community');

    await page.goto('/fleets/register');
    await page.getByLabel('Name', { exact: true }).fill(secondCommunityName);
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);

    await page
      .getByRole('link', {
        name: `Register a Fleet into ${secondCommunityName}`,
      })
      .click();
    await page.getByLabel('Name, exactly as in game').fill(fleetName);
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page
      .getByLabel('How people join')
      .selectOption({ label: 'By application' });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    // Told, and not stopped: nobody's record of a name is the real one.
    await expect(
      page.getByText(/already answers? to that name on that platform/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
  });

  test('a site admin sees the Fleet’s provenance, suspends and reinstates it, and its history shows both', async ({
    as,
  }) => {
    const admin = await as('admin');
    const owner = await as('owner');
    const { people } = fleetPeople();

    await admin.goto(`${communityPath}/manage/dispute`);
    await expect(
      admin.getByText('STO Info cannot tell who leads a Fleet or an Armada'),
    ).toBeVisible();

    const fleet = admin.getByRole('article').filter({ hasText: fleetName });

    await expect(
      fleet.getByRole('row').filter({ hasText: communityName }),
    ).toContainText(people.owner.username);

    // Every registration of the name on the platform, this one first.
    const registrations = fleet
      .getByRole('table', {
        name: 'Registrations of this name on Windows, this one first',
      })
      .getByRole('row');

    await expect(registrations.nth(1)).toContainText(communityName);
    await expect(
      registrations.filter({ hasText: secondCommunityName }),
    ).toContainText(people.owner.username);

    await fleet.getByRole('button', { name: 'Suspend…' }).click();
    await answer(admin, 'Reason', why('suspend the Fleet'), 'Suspend');
    await expect(
      admin.getByText('It is suspended: it can be read, and nothing in it'),
    ).toBeVisible();

    await fleet.getByRole('button', { name: 'Reinstate…' }).click();
    await answer(admin, 'Reason', why('reinstate the Fleet'), 'Reinstate');
    await expect(admin.getByText('Its suspension is lifted.')).toBeVisible();

    await owner.goto(`${fleetPath}/manage/history`);
    await expect(
      owner.getByText(
        'A site administrator suspended it: nothing here may change until it is reinstated.',
      ),
    ).toBeVisible();
    await expect(
      owner.getByText('A site administrator lifted its suspension.'),
    ).toBeVisible();
    await expect(
      owner.getByText(`Reason: ${why('suspend the Fleet')}`),
    ).toBeVisible();
    await expect(
      owner.getByText(`Reason: ${why('reinstate the Fleet')}`),
    ).toBeVisible();
  });

  test('a site admin looks into the Fleet’s imports, reads only, and the look is logged', async ({
    as,
  }) => {
    const page = await as('admin');

    await page.goto(`${communityPath}/manage/dispute`);
    await page
      .getByRole('article')
      .filter({ hasText: fleetName })
      .getByRole('button', { name: 'Look into its imports…' })
      .click();
    await answer(page, 'Purpose', why('look into the imports'), 'Look in');
    await expect(page).toHaveURL(/\/investigate$/);

    const investigatePath = new URL(page.url()).pathname;

    await expect(
      page.getByRole('note').filter({ hasText: READ_ONLY_NOTE }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Import a roster export' }),
    ).toHaveCount(0);

    for (const name of [
      'Conflicting exports',
      'Roster identities',
      'Former names',
      'Rank order',
    ]) {
      await page.goto(investigatePath);
      await page.getByRole('link', { name, exact: true }).click();
      await expect(
        page.getByRole('note').filter({ hasText: READ_ONLY_NOTE }),
        name,
      ).toBeVisible();
    }

    await page.goto('/admin/fleet-investigations');
    await expect(
      page.getByRole('row').filter({ hasText: why('look into the imports') }),
    ).toContainText(fleetName);
  });

  test('Manage Permissions changes a test member’s role, with a reason', async ({
    as,
  }) => {
    const page = await as('admin');
    const { people } = fleetPeople();

    await page.goto('/admin/permissions');
    await page
      .getByLabel('Search by email or username')
      .fill(people.stranger.email);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await press(
      page,
      page
        .getByRole('article')
        .filter({ hasText: people.stranger.username })
        .getByRole('button', { name: 'Manage permissions' }),
    );

    for (const [role, reason, done] of [
      [
        'Storytime Curator',
        why('make a curator'),
        'is now a storytime curator.',
      ],
      ['Member', why('make a member again'), 'is now a member.'],
    ]) {
      const changeRole = page.getByRole('button', { name: 'Change role' });

      // The member's details arrive after the panel opens and set the field
      // back to their current role, so choose until the choice holds.
      await expect(async () => {
        await page.getByLabel('Role', { exact: true }).selectOption({
          label: role,
        });
        await expect(changeRole).toBeEnabled({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
      await changeRole.click();
      await answer(page, 'Reason', reason, 'Change role');
      await expect(
        page.getByText(`${people.stranger.username} ${done}`),
      ).toBeVisible();
    }

    // An override on top of the role, granted and then withdrawn.
    const tags = page
      .locator('article', {
        has: page.locator('code', { hasText: 'storytime.tag.manage' }),
      })
      .last();

    await expect(tags).toContainText('Not held');
    await tags.getByRole('button', { name: 'Grant', exact: true }).click();
    await page
      .getByLabel('Reason', { exact: true })
      .fill(why('grant an override'));
    await page.getByRole('button', { name: 'Apply override' }).click();
    await expect(
      page.getByText(
        `Manage tags was granted for ${people.stranger.username}.`,
      ),
    ).toBeVisible();
    await expect(tags).toContainText('Granted by override');

    await tags.getByRole('button', { name: 'Withdraw', exact: true }).click();
    await answer(page, 'Reason', why('withdraw the override'), 'Withdraw');
    await expect(
      page.getByText(/^\s*The override on Manage tags was withdrawn from/),
    ).toBeVisible();
    await expect(tags).toContainText('Not held');
  });

  test('Manage Members disables and restores a test account, each with a reason', async ({
    as,
    browser,
  }, info) => {
    const page = await as('admin');
    const { people } = fleetPeople();
    const name = people.stranger.username;

    await page.goto('/admin/users');
    await page
      .getByLabel('Search by email or username')
      .fill(people.stranger.email);
    await page.getByRole('button', { name: 'Apply' }).click();

    const card = page.getByRole('article').filter({ hasText: name });

    await press(
      page,
      card.getByRole('button', { name: 'Disable this account' }),
    );
    await answer(page, 'Reason', why('disable the account'), 'Disable');
    await expect(
      page.getByText(`${name}'s account was disabled.`),
    ).toBeVisible();
    await expect(card).toContainText(why('disable the account'));

    await press(
      page,
      card.getByRole('button', { name: 'Restore this account' }),
    );
    await answer(page, 'Reason', why('restore the account'), 'Restore');
    await expect(
      page.getByText(`${name}'s account was restored.`),
    ).toBeVisible();

    // Disabling signed them out everywhere, the saved session included.
    await signInAgain(browser, info, 'stranger');
  });

  test('a rescan over Fleet artwork runs to its end; one over everything is paused, resumed and cancelled', async ({
    as,
  }) => {
    test.setTimeout(300_000);

    const page = await as('admin');
    const panel = page.getByRole('region', { name: 'Rescan campaigns' });
    const newest = panel
      .getByRole('list', { name: 'Campaigns, newest first' })
      .getByRole('listitem')
      .first();
    const fleetArtwork = panel.getByRole('checkbox', { name: 'Fleet artwork' });

    // An earlier run that stopped part-way may have left the queue held.
    rescanQueue('resume');
    await page.goto('/admin/scan-diagnostics');
    await expect(
      panel.getByText('Waiting for a verdict', { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText('Never scanned', { exact: true }),
    ).toBeVisible();

    await fleetArtwork.check();
    await panel.getByRole('button', { name: 'Start a campaign' }).click();
    await answer(page, 'Reason', why('rescan Fleet artwork'), 'Start');
    await expect(
      panel.getByText('Campaign started. Refresh to follow it.'),
    ).toBeVisible();
    await expect(async () => {
      await panel.getByRole('button', { name: 'Refresh' }).click();
      await expect(newest.getByRole('heading')).toContainText('Finished', {
        timeout: 2_000,
      });
    }).toPass({ timeout: 120_000 });

    await fleetArtwork.uncheck();
    rescanQueue('pause');

    try {
      await panel.getByRole('button', { name: 'Start a campaign' }).click();
      await answer(page, 'Reason', why('rescan everything'), 'Start');
      await expect(newest.getByRole('heading')).toContainText('Running');

      for (const [button, confirm, reason, state] of [
        ['Pause', 'Pause', why('pause the rescan'), 'Paused'],
        ['Resume', 'Resume', why('resume the rescan'), 'Running'],
        ['Cancel', 'Cancel campaign', why('cancel the rescan'), 'Cancelled'],
      ]) {
        await newest.getByRole('button', { name: button, exact: true }).click();
        await answer(page, 'Reason', reason, confirm);
        await expect(newest.getByRole('heading')).toContainText(state);
      }
    } finally {
      rescanQueue('resume');
    }
  });

  test('Scan Diagnostics shows refused uploads, and looks an asset up by its ID', async ({
    as,
  }) => {
    const page = await as('admin');
    const refused = page.getByRole('region', { name: 'Refused uploads' });
    const lookUp = async (id: string): Promise<void> => {
      await refused.getByLabel('Look up an asset by its ID').fill(id);
      await refused
        .getByRole('button', { name: 'Look up', exact: true })
        .click();
    };

    await page.goto('/admin/scan-diagnostics');
    await expect(refused).toBeVisible();

    const list = refused.getByRole('table');

    await expect(
      list.or(refused.getByText('Nothing has been refused.')),
    ).toBeVisible();

    await lookUp('not-an-asset');
    await expect(refused.getByText('That is not an asset ID.')).toBeVisible();

    await lookUp(randomUUID());
    await expect(refused.getByText('No asset has that ID.')).toBeVisible();

    // A real one, when this machine has refused anything to look up.
    if ((await list.count()) > 0) {
      const id = (await list.locator('tbody code').first().textContent())!;

      await lookUp(id.trim());
      await expect(refused.locator('dl').getByText(id.trim())).toBeVisible();
    }
  });

  test('the Security Log lists each action with its reason, under every source', async ({
    as,
  }) => {
    const page = await as('admin');
    const expected: Record<string, string[]> = {
      Everything: [why('disable the account')],
      'Site admin actions': [
        why('make a curator'),
        why('make a member again'),
        why('grant an override'),
        why('withdraw the override'),
        why('close the member report'),
        why('dismiss the member report'),
        why('disable the account'),
        why('restore the account'),
        why('resolve the report'),
        why('dismiss the report'),
        why('rescan Fleet artwork'),
        why('rescan everything'),
        why('pause the rescan'),
        why('resume the rescan'),
        why('cancel the rescan'),
      ],
      'Fleet disputes': [why('suspend the Fleet'), why('reinstate the Fleet')],
      'Moderation holds': [
        why('hold the evidence'),
        why('read the evidence'),
        why('extend the hold'),
        why('release the hold'),
        why('hold until its review'),
        why('release after its review'),
      ],
      'Fleet investigations': [why('look into the imports')],
      'Roster erasures': [],
      'Retention runs': [],
    };

    await page.goto('/admin/security-log');

    for (const [source, reasons] of Object.entries(expected)) {
      await page
        .getByLabel('Show', { exact: true })
        .selectOption({ label: source });
      await expect(
        page
          .getByText('Security log entries, newest first')
          .or(page.getByText('Nothing has been logged here yet.')),
        source,
      ).toBeVisible();
      await expect(page.getByText('Not read', { exact: true })).toHaveCount(0);

      for (const reason of reasons) {
        await expect(
          page.getByRole('row').filter({ hasText: reason }),
          `${source}: ${reason}`,
        ).toBeVisible();
      }
    }
  });

  test('with Storytime on, the Owner publishes a Story, and two people report it', async ({
    as,
  }, info) => {
    test.setTimeout(240_000);

    const owner = await as('owner');

    storyTitle = named(info, 'Owed Story');
    storySlug = storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Nothing in the interface turns it on; the server reads the switch
    // within ten seconds. The next test puts it back as the run found it.
    backendSupport('fleet-storytime', 'on');
    await expect(async () => {
      await owner.goto('/storytime/manage/stories/new');
      await expect(
        owner.getByRole('heading', { name: 'Create a Story' }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000, intervals: [2_000] });

    await owner.getByLabel('Title', { exact: true }).fill(storyTitle);
    await owner.getByLabel('URL slug').fill(storySlug);
    await owner
      .getByLabel('Short description')
      .fill('FC-044 journey: a test Story.');
    await owner
      .getByLabel('Visibility', { exact: true })
      .selectOption({ label: 'Public' });
    await owner.getByRole('button', { name: 'Save', exact: true }).click();
    await owner.waitForURL(/\/storytime\/manage\/stories\/[0-9a-f-]{36}$/);

    const storyPath = new URL(owner.url()).pathname;

    await owner.getByRole('button', { name: 'I confirm' }).click();
    await expect(owner.getByRole('button', { name: 'I confirm' })).toHaveCount(
      0,
    );

    await owner.goto(`${storyPath}/chapters/new`);
    await owner.getByLabel('Title', { exact: true }).fill('Chapter one');
    await owner
      .getByLabel('Chapter', { exact: true })
      .fill('FC-044 journey: a test Chapter.');
    await owner.getByRole('button', { name: 'Save', exact: true }).click();
    await owner.waitForURL(/\/storytime\/manage\/chapters\/[0-9a-f-]{36}$/);
    await owner.getByRole('button', { name: 'Save and publish' }).click();
    await owner.waitForURL(/\/chapters$/);

    await owner.goto(storyPath);
    await owner.getByRole('button', { name: 'Save and publish' }).click();
    await owner.waitForURL(/\/storytime\/manage\/stories$/);

    for (const role of ['friend', 'officer'] as const) {
      const page = await as(role);

      await page.goto(`/storytime/stories/${storySlug}`);
      await page.getByRole('button', { name: 'Report this Story' }).click();

      const dialog = page.getByRole('dialog');

      await dialog
        .getByLabel('Anything you want to add')
        .fill(why(`${role}’s Story report`));
      await dialog.getByRole('button', { name: 'Send report' }).click();
      await expect(
        page.getByText('Thank you. An administrator will look at this.'),
      ).toBeVisible();
    }
  });

  test('Storytime Moderation refuses a dismissal without a note, and an appeal decided without a message', async ({
    as,
  }) => {
    const admin = await as('admin');
    const owner = await as('owner');
    const queue = '/storytime/manage/moderation';
    const report = (role: string) =>
      admin
        .locator('ul.storytime-moderation__reports > li')
        .filter({ hasText: why(`${role}’s Story report`) });
    const appeal = admin
      .locator('ul.storytime-moderation__appeals > li')
      .filter({ hasText: why('appeal the removal') });
    const message = admin.getByLabel('What the creator is told');
    const note = admin.getByLabel('Note for the record');

    try {
      await admin.goto(queue);

      // Dismissed without a note: refused, and nothing sent.
      await report('friend').getByRole('button', { name: 'Dismiss' }).click();
      await expect(
        admin.getByText(
          'Say why the report is dismissed. It is kept with the report and in the site admin log.',
        ),
      ).toBeVisible();
      await expect(report('friend')).toContainText('OPEN');

      await note.fill(why('dismiss the Story report'));
      await report('friend').getByRole('button', { name: 'Dismiss' }).click();
      await expect(report('friend')).toContainText('DISMISSED');

      // Removing it closes every report still open about it, in the same
      // request, so leaving the page at once cancels nothing.
      const removed = admin.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname.endsWith('/moderation/remove'),
      );

      await message.fill(why('remove the Story'));
      await report('officer')
        .getByRole('button', { name: 'Remove the content' })
        .click();
      expect((await removed).ok()).toBe(true);
      await admin.goto(queue);
      await expect(report('officer')).toContainText('ACTIONED');

      await owner.goto('/storytime/manage/stories');

      const story = owner
        .locator('article.storytime-record')
        .filter({ hasText: storyTitle });

      await expect(story).toContainText(
        'This Story has been removed by an administrator.',
      );
      await story.getByRole('button', { name: 'Appeal this removal' }).click();
      await story.getByLabel('Your appeal').fill(why('appeal the removal'));
      await story.getByRole('button', { name: 'Send appeal' }).click();
      await expect(
        owner.getByText(
          'Your appeal has been sent. An administrator will read it.',
        ),
      ).toBeVisible();

      // Decided without a message: refused, and the appeal still waits.
      await admin.goto(queue);
      await appeal.getByRole('button', { name: 'Reject' }).click();
      await expect(
        admin.getByText(
          'Say what the creator is told about their appeal. They are shown it word for word.',
        ),
      ).toBeVisible();
      await expect(appeal).toHaveCount(1);

      await message.fill(why('uphold the appeal'));
      await appeal.getByRole('button', { name: 'Uphold and restore' }).click();
      await expect(appeal).toHaveCount(0);

      // Restored, so its page reads again.
      await owner.goto(`/storytime/stories/${storySlug}`);
      await expect(
        owner.getByRole('heading', { name: storyTitle }),
      ).toBeVisible();
    } finally {
      // As the run found it: the Help journeys count its section.
      backendSupport('fleet-storytime', 'restore', FLEET_PEOPLE_FILE);
    }
  });

  test('an export held for a conflict, whose file expires first, is shown as expired and cannot be chosen', async ({
    as,
  }) => {
    // Starting the backend to run the retention takes a minute or two.
    test.setTimeout(420_000);

    const page = await as('owner');

    // The same moment as the export in force, and different rows.
    await page.goto(`${fleetPath}/import`);
    await page.getByLabel('The export, as the game wrote it').setInputFiles({
      name: `${fleetName}_20240101-120000.Csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `${ROSTER_ROWS.slice(0, 2).join('\r\n')}\r\n`,
        'utf8',
      ),
    });
    await page.getByLabel('The clock it was taken on').selectOption('UTC');
    await page.getByRole('button', { name: 'Check this export' }).click();
    await page.getByRole('button', { name: 'Import this export' }).click();
    await expect(
      page.getByText(/Another export of this Fleet claims the same moment/),
    ).toBeVisible({ timeout: 120_000 });

    const importId = new URL(page.url()).pathname.split('/').pop() as string;
    const { moved } = backendSupport<{ moved: number }>(
      'fleet-expire-export',
      importId,
    );

    expect(moved).toBe(1);

    await page.goto(`${fleetPath}/investigate/conflicts`);
    await page
      .getByRole('navigation', { name: 'Which conflicts' })
      .getByRole('link', { name: 'All', exact: true })
      .click();

    const expired = page.getByRole('row').filter({ hasText: 'File expired' });

    await expect(expired).toHaveCount(1);
    await expect(expired).toContainText(
      'its file expired before it was chosen, so it can no longer be selected',
    );
    await expect(expired.getByRole('button')).toHaveCount(0);
  });

  test('the Security Log reads more than fifty entries a page at a time', async ({
    as,
  }) => {
    const page = await as('admin');

    // Each read of Scan Diagnostics is logged: enough of them make a second
    // page whatever was here before.
    await settle(page, '/admin/security-log');

    const token = await page.evaluate(() =>
      localStorage.getItem('access_token'),
    );

    for (let read = 0; read < 51; read++) {
      const answer = await page.request.get(
        `${API_URL}/admin/file-scanning/diagnostics`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      expect(answer.status()).toBe(200);
    }

    await settle(page, '/admin/security-log');

    const newer = page.getByRole('button', { name: 'Newer', exact: true });
    const older = page.getByRole('button', { name: 'Older', exact: true });

    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    await expect(newer).toBeDisabled();
    await older.click();
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await expect(newer).toBeEnabled();
    await newer.click();
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
  });

  test('no site administration page scrolls sideways, on a phone either', async ({
    as,
  }, info) => {
    const page = await as('admin');
    // The phone project is a phone already; the desktop's is narrowed too.
    const sizes = info.project.name.includes('mobile')
      ? [null]
      : [null, { width: 375, height: 812 }];

    for (const size of sizes) {
      if (size) {
        await page.setViewportSize(size);
      }

      for (const path of [...ADMIN_PAGES, `${communityPath}/manage/dispute`]) {
        await settle(page, path);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${path} at ${size?.width ?? 'the project’s'} width`,
        ).toBe(true);
      }
    }
  });
});
