import { resolve } from 'node:path';

import { expect, Page } from '@playwright/test';

import { backendSupport, backendSupportStarted } from '../support/backend';
import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The signed-in checks owed by FC-027, FC-029 and FC-049 (FC-044): a Fleet's
 * news written, covered, published, searched, kept from the wrong readers and
 * from the site's own News and its API, renamed, unpublished and deleted with
 * its cover taken down, with a pass on an Armada's and a Community's; the
 * activity that publishing, joining, roles, holdings, imports and an Armada
 * placement leave, for whoever may see it, on the Dashboard, and past its
 * first page; the notice asking whether a registered Character on an import
 * is its owner's, and none for an owner who answered first; Settings and its
 * guides leading to each other; and none of those pages scrolling sideways,
 * down to 375px.
 *
 * Run on a desktop and again on a phone (the `fleet-desktop` and
 * `fleet-mobile` projects), each on records of its own.
 */

/** A 1200px square picture, wide enough for a 16:9 cover once cropped. */
const PICTURE = resolve('e2e/fixtures/picture.png');

/** What a post's page says for a post it will not show the reader. */
const NOT_FOUND = /No post answers to that address\./;

/** Each help link on Settings, and the guide it should open. */
const SETTINGS_GUIDES: Readonly<Record<string, string>> = {
  'Help with Settings': 'your-settings',
  'Help with Privacy Mode': 'privacy-mode',
  'Help with staying signed in': 'staying-signed-in',
  'Help with dates and times': 'dates-and-times',
  'Help with Fleet settings': 'fleet-settings',
  'Help with notifications': 'what-you-are-notified-about',
  'Help with Custom Tracking': 'what-custom-tracking-is',
};

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

/**
 * Opens a page, waits until it has settled, and checks that it is no wider
 * than the window, so nothing on it has to be scrolled sideways to be read.
 *
 * @param page - The page.
 * @param path - Where.
 */
async function noSidewaysScroll(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main'), `${path} drew its page`).toBeVisible();

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(scrollWidth, `${path} at ${innerWidth}px`).toBeLessThanOrEqual(
    innerWidth,
  );
}

/**
 * Fills the news editor's title, summary and post.
 *
 * @param page - The page, on the editor.
 * @param title - The title.
 * @param summary - The summary.
 */
async function fillPost(
  page: Page,
  title: string,
  summary: string,
): Promise<void> {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Summary (optional)').fill(summary);
  await page
    .getByLabel('Post (Markdown)')
    .fill('FC-044 journey: a test post, with **some** Markdown.');
}

/** The activity a page lists. */
const activityOf = (page: Page) =>
  page.getByRole('list', { name: 'Activity, newest first' });

/** Where the API is, for what the site's own News answers. */
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000';

/** A roster export's header, as the game writes it. */
const ROSTER_HEADER =
  'Character Name,Account Handle,Level,Class,Guild Rank,Contribution Total,Join Date,Rank Change Date,Last Active Date,Status,Public Comment,Public Comment Last Edit Date';

/**
 * One member's row in a roster export.
 *
 * @param name - The Character's name.
 * @param handle - The account's handle, without its `@`.
 * @returns The row.
 */
const rosterRow = (name: string, handle: string): string =>
  `${name},@${handle},65,Starfleet Tactical Officer,Member,120500,3/4/2023 8:15:00pm,6/1/2023 9:00:00am,1/1/2024 11:45:00am,"Offline","",`;

/**
 * Opens one of an Armada's own tabs, which on a phone may sit behind a menu.
 *
 * @param page - The page.
 * @param name - The tab's name.
 */
async function openArmadaTab(page: Page, name: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Armada sections' })
    .last()
    .getByRole('link', { name, exact: true })
    .click();
}

/**
 * Records one track of a holding at a tier, as the Owner does on the
 * Holdings tab.
 *
 * @param page - The page, on the Holdings tab.
 * @param tier - The tier.
 */
async function recordStarbase(page: Page, tier: number): Promise<void> {
  await page
    .getByRole('region', { name: 'Fleet Starbase', exact: true })
    .getByRole('button', { name: 'Record…' })
    .click();

  const form = page.getByRole('form', { name: 'Record the Fleet Starbase' });

  await form
    .getByLabel('Starbase', { exact: true })
    .selectOption({ label: `Tier ${tier}` });
  await form.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(
    page.getByText('Fleet Starbase recorded.', { exact: true }),
  ).toBeVisible();
  await expect(form).toHaveCount(0);
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe
  .serial('A Fleet’s news and activity, as its people see them', () => {
  let communityName: string;
  let communityPath: string;
  let fleetName: string;
  let fleetPath: string;
  let title: string;
  let postPath: string;
  let membersTitle: string;
  let membersPath: string;
  let communityPostTitle: string;
  let armadaName: string;
  let armadaPath: string;
  let coverAssetId: string;
  let importPath: string;

  /** How the activity says the Fleet's public post was published. */
  const published = (): string => `“${title}” was published.`;

  test('the Owner registers a Community and a Fleet', async ({ as }, info) => {
    const page = await as('owner');

    communityName = named(info, 'News Community');
    fleetName = named(info, 'News Fleet');

    await page.goto('/fleets/register');
    await page.getByLabel('Name', { exact: true }).fill(communityName);
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    communityPath = new URL(page.url()).pathname;

    await page
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await page.getByLabel('Name, exactly as in game').fill(fleetName);
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    // An Armada takes Fleets of its own allegiance.
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
  });

  test('the Owner registers an Armada, and its news reaches somebody signed out', async ({
    as,
    anonymous,
  }, info) => {
    const page = await as('owner');
    const visitor = await anonymous();
    const armadaPost = named(info, 'Armada Post');

    armadaName = named(info, 'News Armada');

    await page.goto(communityPath);
    await page
      .getByRole('link', { name: `Register an Armada into ${communityName}` })
      .click();
    await page.getByLabel('Name, exactly as in game').fill(armadaName);
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/armadas\/windows\/[^/]+$/);
    armadaPath = new URL(page.url()).pathname;

    await openArmadaTab(page, 'News');
    await page.getByRole('link', { name: 'Write a post' }).click();
    await fillPost(page, armadaPost, named(info, 'Armada Gist'));
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('heading', { name: armadaPost })).toBeVisible();

    await visitor.goto(`${armadaPath}/news`);
    await expect(
      visitor
        .getByRole('list', { name: 'Posts, newest first' })
        .getByRole('link', { name: armadaPost }),
    ).toBeVisible();
  });

  test('a draft is listed under Drafts, and not among the published posts', async ({
    as,
  }, info) => {
    const page = await as('owner');

    title = named(info, 'Post');

    await page.goto(fleetPath);
    await openTab(page, 'News');
    await page.getByRole('link', { name: 'Write a post' }).click();
    await fillPost(page, title, named(info, 'Gist'));
    await page.getByRole('button', { name: 'Save draft' }).click();

    // A new draft opens in the editor again, where a cover can be added.
    await expect(page).toHaveURL(/\/news\/[^/]+\/edit$/);
    postPath = new URL(page.url()).pathname.replace(/\/edit$/, '');

    await page.goto(`${fleetPath}/news`);
    await expect(
      page.getByText('Nothing has been published here yet.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Drafts', exact: true }).click();
    await expect(
      page.getByRole('list', { name: 'Drafts' }).getByRole('link', {
        name: title,
      }),
    ).toBeVisible();
  });

  test('the draft takes a cover, once the scanner has cleared it', async ({
    as,
  }) => {
    test.setTimeout(240_000);

    const page = await as('owner');
    const description = 'FC-044 journey: a test cover.';

    await page.goto(`${postPath}/edit`);
    await page.getByRole('button', { name: 'Set the cover' }).click();

    const dialog = page.getByRole('dialog');

    await dialog
      .getByLabel('Choose a picture for the Cover')
      .setInputFiles(PICTURE);
    await dialog.getByLabel('What does this picture show?').fill(description);
    await expect(dialog.getByRole('button', { name: 'Upload' })).toBeEnabled();

    // Its ID, to look it up once the post is deleted.
    const uploaded = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/cover-image'),
    );

    await dialog.getByRole('button', { name: 'Upload' }).click();
    coverAssetId = ((await (await uploaded).json()) as { assetId: string })
      .assetId;
    // Scanned by the local worker's clamd before it is put to use.
    await expect(dialog).toBeHidden({ timeout: 120_000 });
    await expect(page.getByAltText(description)).toBeVisible();
  });

  test('once published, the post is found by its title and its summary, and its Activity links to it', async ({
    as,
  }, info) => {
    const page = await as('owner');

    await page.goto(postPath);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Unpublish', exact: true }),
    ).toBeVisible();

    await page.goto(`${fleetPath}/news`);

    for (const words of [title, named(info, 'Gist')]) {
      await page.getByLabel('Search titles and summaries').fill(words);
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(page).toHaveURL(/[?&]q=/);
      await expect(
        page
          .getByRole('list', { name: 'Posts, newest first' })
          .getByRole('link', { name: title }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect(page).not.toHaveURL(/[?&]q=/);
    }

    await openTab(page, 'Activity');
    await activityOf(page)
      .getByRole('link', { name: published(), exact: true })
      .click();
    await expect(page).toHaveURL(postPath);
  });

  test('a Members-only post is hidden from somebody signed out, and from the site’s own News', async ({
    as,
    anonymous,
  }, info) => {
    const owner = await as('owner');
    const visitor = await anonymous();

    membersTitle = named(info, 'Members Post');

    await owner.goto(`${fleetPath}/news/write`);
    await fillPost(owner, membersTitle, named(info, 'Members Gist'));
    await owner
      .getByRole('radio', { name: 'Approved members of the Fleet' })
      .check();
    await owner.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      owner.getByRole('heading', { name: membersTitle }),
    ).toBeVisible();

    membersPath = new URL(owner.url()).pathname;

    // The public post first, so the list is known to have arrived.
    await visitor.goto(`${fleetPath}/news`);
    await expect(visitor.getByRole('link', { name: title })).toBeVisible();
    await expect(visitor.getByRole('link', { name: membersTitle })).toHaveCount(
      0,
    );
    await visitor.goto(membersPath);
    await expect(visitor.getByText(NOT_FOUND)).toBeVisible();

    // The site's News is the site's alone, whoever is reading it.
    await owner.goto('/news');
    await owner.waitForLoadState('networkidle');
    await expect(
      owner.getByRole('heading', { name: 'News & Release Notes' }),
    ).toBeVisible();
    await expect(owner.getByText(title)).toHaveCount(0);
    await expect(owner.getByText(membersTitle)).toHaveCount(0);
  });

  test('the site’s News API lists neither post, and answers neither address', async ({
    request,
  }) => {
    const slugs = [postPath, membersPath].map(path => path.split('/').pop());
    const listed = await request.get(`${API_URL}/news?pageSize=50`);

    expect(listed.status()).toBe(200);

    const { items } = (await listed.json()) as {
      items: { title: string; communityId: string | null }[];
    };

    expect(items.map(item => item.title)).not.toContain(title);
    expect(items.map(item => item.title)).not.toContain(membersTitle);
    expect(items.filter(item => item.communityId !== null)).toEqual([]);

    for (const slug of slugs) {
      expect(
        (await request.get(`${API_URL}/news/${slug}`)).status(),
        `GET /news/${slug}`,
      ).toBe(404);
    }
  });

  test('changing a post’s title keeps its address', async ({ as }, info) => {
    const page = await as('owner');

    title = named(info, 'Renamed Post');

    await page.goto(postPath);
    await page.getByRole('link', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page).toHaveURL(postPath);
  });

  test('a new member’s joining is shown to members, not to somebody signed out', async ({
    as,
    anonymous,
  }) => {
    const owner = await as('owner');
    const applicant = await as('applicant');
    const visitor = await anonymous();
    const { people } = fleetPeople();
    const joined = `${people.applicant.username} joined.`;

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

    await applicant.goto(`${fleetPath}/activity`);
    await expect(activityOf(applicant).getByText(joined)).toBeVisible();
    // A member now, so the Members-only post is theirs to read.
    await applicant.goto(`${fleetPath}/news`);
    await expect(
      applicant.getByRole('link', { name: membersTitle }),
    ).toBeVisible();

    // The public post's item first, so the feed is known to have arrived.
    await visitor.goto(`${fleetPath}/activity`);
    await expect(activityOf(visitor).getByText(published())).toBeVisible();
    await expect(activityOf(visitor).getByText(joined)).toHaveCount(0);
  });

  test('a role appointed and withdrawn is shown to members, not to somebody signed out', async ({
    as,
    anonymous,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');
    const visitor = await anonymous();
    const { username } = fleetPeople().people.applicant;
    const sentences = [
      `${username} was made an Officer.`,
      `${username} is no longer an Officer.`,
    ];

    await owner.goto(fleetPath);
    await openTab(owner, 'Manage');
    await owner.getByRole('link', { name: 'Roles', exact: true }).click();

    const appoint = owner.getByRole('form', { name: 'Appoint somebody' });

    await appoint.getByLabel('Person').selectOption({ label: username });
    await appoint
      .getByLabel('Role', { exact: true })
      .selectOption({ label: 'Officer' });
    await appoint.getByRole('button', { name: 'Appoint' }).click();
    await expect(owner.getByText('Appointed.', { exact: true })).toBeVisible();

    await owner
      .getByRole('row', { name: new RegExp(username) })
      .getByRole('button', { name: 'Withdraw…' })
      .click();

    const withdraw = owner.getByRole('form', { name: 'Withdraw a role' });

    await withdraw.getByLabel('Reason').fill('FC-044 journey: a test.');
    await withdraw
      .getByRole('button', { name: 'Withdraw', exact: true })
      .click();
    await expect(
      owner.getByText('The role is withdrawn.', { exact: true }),
    ).toBeVisible();

    await member.goto(`${fleetPath}/activity`);
    await visitor.goto(`${fleetPath}/activity`);
    await expect(activityOf(visitor).getByText(published())).toBeVisible();

    for (const sentence of sentences) {
      await expect(activityOf(member).getByText(sentence)).toBeVisible();
      await expect(activityOf(visitor).getByText(sentence)).toHaveCount(0);
    }
  });

  test('holdings recorded are shown to anyone who can see the Fleet', async ({
    as,
    anonymous,
  }) => {
    const owner = await as('owner');
    const visitor = await anonymous();

    await owner.goto(fleetPath);
    await openTab(owner, 'Holdings');
    await recordStarbase(owner, 1);

    await visitor.goto(`${fleetPath}/activity`);
    await expect(
      activityOf(visitor).getByText('Fleet Starbase tiers were recorded.'),
    ).toBeVisible();
  });

  test('an import is counted for members only, and its registered Characters’ owners are asked', async ({
    as,
    anonymous,
  }) => {
    test.setTimeout(300_000);

    const owner = await as('owner');
    const member = await as('applicant');
    const visitor = await anonymous();
    const { people } = fleetPeople();
    const imported =
      'A roster export was imported: 4 members, 0 joined and 0 left.';

    // The friend answers before their notice can go: it is held from the
    // outbox as soon as the import's replay queues it.
    const hold = backendSupportStarted<{ held: number }>(
      'fleet-proposal-notices',
      people.friend.email,
      'hold',
      '240',
    );

    await hold.ready;
    await owner.goto(`${fleetPath}/import`);
    await owner.getByLabel('The export, as the game wrote it').setInputFiles({
      name: `${fleetName}_20240101-120000.Csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `${[
          ROSTER_HEADER,
          rosterRow('Aria Venn', 'fixture001'),
          rosterRow('Dax Orlan', 'fixture002'),
          rosterRow(
            people.stranger.characterName,
            people.stranger.accountHandle,
          ),
          rosterRow(people.friend.characterName, people.friend.accountHandle),
        ].join('\r\n')}\r\n`,
        'utf8',
      ),
    });
    await owner.getByLabel('The clock it was taken on').selectOption('UTC');
    await owner.getByRole('button', { name: 'Check this export' }).click();
    await expect(owner.getByText('Ready to import')).toBeVisible();
    await owner.getByRole('button', { name: 'Import this export' }).click();
    await expect(owner.getByText('Imported', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
    importPath = new URL(owner.url()).pathname;

    expect((await hold.done).held, 'the friend’s notice was held').toBe(1);

    // Written by the replay that follows the import.
    await expect(async () => {
      await member.goto(`${fleetPath}/activity`);
      await expect(activityOf(member).getByText(imported)).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 60_000 });

    await visitor.goto(`${fleetPath}/activity`);
    await expect(
      activityOf(visitor).getByText('Fleet Starbase tiers were recorded.'),
    ).toBeVisible();
    await expect(activityOf(visitor).getByText(imported)).toHaveCount(0);
  });

  test('the owner of a registered Character on the roster is asked once whether it is theirs', async ({
    as,
  }) => {
    test.setTimeout(240_000);

    const page = await as('stranger');
    const { stranger } = fleetPeople().people;
    const question = `Is ${stranger.characterName}@${stranger.accountHandle} in ${fleetName}?`;

    // The outbox runs once a minute.
    await expect(async () => {
      await page.goto('/notifications');
      await expect(page.getByText(question, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 180_000 });
    await expect(page.getByText(question, { exact: true })).toHaveCount(1);
  });

  test('a Character’s owner who answers first is not asked', async ({ as }) => {
    test.setTimeout(240_000);

    const page = await as('friend');
    const { friend } = fleetPeople().people;
    const question = `Is ${friend.characterName}@${friend.accountHandle} in ${fleetName}?`;

    await page.goto(
      `/dashboard/accounts/${encodeURIComponent(friend.accountHandle)}/${encodeURIComponent(friend.characterName)}`,
    );

    const proposal = page
      .locator('.character-fleet__proposal')
      .filter({ hasText: fleetName });

    await proposal.getByRole('button', { name: 'No', exact: true }).click();
    await expect(proposal).toHaveCount(0);

    const released = backendSupport<{
      released: number;
      delivered: number;
      skipped: number;
    }>('fleet-proposal-notices', friend.email, 'release', '150');

    expect(released).toEqual({ released: 1, delivered: 0, skipped: 1 });

    await page.goto('/notifications');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(question, { exact: true })).toHaveCount(0);
  });

  test('marking the import partial replays the roster, and adds no second item', async ({
    as,
  }) => {
    const owner = await as('owner');
    const member = await as('applicant');

    await owner.goto(importPath);

    const corrections = owner.getByRole('region', { name: 'Corrections' });

    await corrections
      .getByLabel('Why', { exact: true })
      .fill('FC-044 journey: a test replay.');
    await corrections.getByRole('button', { name: 'Mark it partial' }).click();
    await expect(corrections.getByRole('status')).toHaveText(
      'Marked partial: nobody missing from it is taken to have left.',
    );

    // Give the replay its moment, then count.
    await owner.waitForTimeout(10_000);
    await member.goto(`${fleetPath}/activity`);
    await expect(
      activityOf(member).getByText(/^\s*A roster export was imported:/),
    ).toHaveCount(1);
  });

  test('a Fleet joining the Armada and moving within it is shown on both', async ({
    as,
    anonymous,
  }) => {
    const owner = await as('owner');
    const visitor = await anonymous();
    const sentences = [
      `${fleetName} joined ${armadaName} as a Beta.`,
      `${fleetName} moved from a Beta to the Alpha in ${armadaName}.`,
    ];

    await owner.goto(fleetPath);

    const ask = owner.getByRole('form', { name: 'Ask to join an Armada' });

    await ask.getByLabel('Armada', { exact: true }).selectOption({
      label: armadaName,
    });
    await ask.getByRole('button', { name: 'Ask to join' }).click();
    await expect(
      owner.getByText('Your request is on its way to the Armada’s managers.'),
    ).toBeVisible();

    await owner.goto(`${armadaPath}/requests`);
    await owner
      .getByRole('row')
      .filter({ hasText: fleetName })
      .getByRole('button', { name: 'Approve…' })
      .click();

    const approve = owner.getByRole('form', { name: `Approve ${fleetName}` });

    await approve.getByLabel('Position').selectOption({ label: 'Beta' });
    await approve.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(
      owner.getByText(`${fleetName} joined the Armada.`, { exact: true }),
    ).toBeVisible();

    await owner.goto(armadaPath);
    await owner
      .getByRole('button', { name: `Move ${fleetName}`, exact: true })
      .click();

    const move = owner.getByRole('form', { name: `Move ${fleetName}` });

    await move.getByLabel('To', { exact: true }).selectOption({
      label: 'Alpha',
    });
    await move
      .getByLabel('Reason', { exact: true })
      .fill('FC-044 journey: a test move.');
    await move.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(
      owner.getByText(`${fleetName} moved.`, { exact: true }),
    ).toBeVisible();

    for (const path of [`${armadaPath}/activity`, `${fleetPath}/activity`]) {
      await visitor.goto(path);

      for (const sentence of sentences) {
        await expect(
          activityOf(visitor).getByText(sentence),
          `${path}: ${sentence}`,
        ).toBeVisible();
      }
    }
  });

  test('the Community’s News section lists a post written from it', async ({
    as,
  }, info) => {
    const page = await as('owner');
    const news = page.getByRole('region', { name: 'News', exact: true });

    communityPostTitle = named(info, 'Community Post');

    await page.goto(communityPath);
    await news.getByRole('link', { name: 'Write a post' }).click();
    await fillPost(page, communityPostTitle, named(info, 'Community Gist'));
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: communityPostTitle }),
    ).toBeVisible();

    await page.goto(communityPath);
    await expect(
      news.getByRole('link', { name: communityPostTitle }),
    ).toBeVisible();
  });

  test('the Dashboard’s Fleet activity names the scope of each item', async ({
    as,
  }) => {
    const page = await as('owner');
    const { username } = fleetPeople().people.applicant;
    const feed = page.getByRole('region', { name: 'Your Fleet activity' });

    await page.goto('/dashboard/fleets');

    // The desktop and phone runs share the people, so an item is told apart
    // by the scope it names as well as by its sentence.
    for (const [sentence, scope] of [
      [`“${communityPostTitle}” was published.`, communityName],
      [`${username} is no longer an Officer.`, fleetName],
    ] as const) {
      await expect(
        feed
          .getByRole('listitem')
          .filter({ hasText: sentence })
          .getByRole('link', { name: scope, exact: true }),
      ).toBeVisible();
    }
  });

  test('unpublishing asks first, and takes the post off the Activity', async ({
    as,
  }) => {
    const page = await as('owner');
    const { username } = fleetPeople().people.applicant;

    await page.goto(postPath);
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Unpublish this post?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Unpublish' }).click();
    await expect(
      page.getByRole('button', { name: 'Publish', exact: true }),
    ).toBeVisible();

    // Another item first, so the feed is known to have arrived.
    await page.goto(`${fleetPath}/activity`);
    await expect(
      activityOf(page).getByText(`${username} joined.`),
    ).toBeVisible();
    await expect(activityOf(page).getByText(published())).toHaveCount(0);
  });

  test('deleting asks first, and the post is gone', async ({ as }) => {
    const page = await as('owner');

    await page.goto(postPath);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    const dialog = page.getByRole('dialog');

    // The dialog's title and its question both say it.
    await expect(dialog.getByText('Delete this post?').first()).toBeVisible();
    await expect(dialog.getByText(title)).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/news$/);
    await page.getByRole('button', { name: 'Drafts', exact: true }).click();
    await expect(page.getByText('There are no drafts.')).toBeVisible();

    await page.goto(postPath);
    await expect(page.getByText(NOT_FOUND)).toBeVisible();
  });

  test('deleting the post took its cover down', async ({ as }) => {
    const page = await as('admin');
    const state = page
      .locator('.scan-diagnostics__asset div')
      .filter({
        has: page.getByRole('term').getByText('State', { exact: true }),
      })
      .getByRole('definition');

    await page.goto('/admin/scan-diagnostics');
    await page.getByLabel('Look up an asset by its ID').fill(coverAssetId);
    await page.getByRole('button', { name: 'Look up', exact: true }).click();
    await expect(state).toHaveText('REVOKED');
  });

  test('past twenty items, Older reads the next ones', async ({
    as,
    anonymous,
  }) => {
    test.setTimeout(240_000);

    const owner = await as('owner');
    const visitor = await anonymous();
    const items = activityOf(visitor).getByRole('listitem');

    // Twenty-one more items anyone may see, each a tier that differs from
    // the one before.
    await owner.goto(fleetPath);
    await openTab(owner, 'Holdings');

    for (let index = 0; index < 21; index++) {
      await recordStarbase(owner, ((index + 1) % 5) + 1);
    }

    await visitor.goto(`${fleetPath}/activity`);
    await expect(items).toHaveCount(20);
    await visitor.getByRole('button', { name: 'Older', exact: true }).click();
    await expect.poll(() => items.count()).toBeGreaterThan(20);
  });

  test('Settings offers help under its title and each heading, and each guide leads back', async ({
    as,
  }) => {
    const page = await as('owner');

    for (const [label, slug] of Object.entries(SETTINGS_GUIDES)) {
      await page.goto('/dashboard/settings');
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(`/help/${slug}`);
      await expect(page.locator('#help-guide-page h1')).toBeVisible();
      await page
        .locator('#help-guide-page')
        .getByRole('link', { name: 'Your settings', exact: true })
        .click();
      await expect(page).toHaveURL('/dashboard/settings');
    }
  });

  test('the news, activity and Settings pages never scroll sideways', async ({
    as,
  }, info) => {
    const page = await as('owner');
    const paths = [
      `${fleetPath}/news/write`,
      `${fleetPath}/news`,
      `${fleetPath}/activity`,
      '/dashboard/settings',
    ];

    for (const path of paths) {
      await noSidewaysScroll(page, path);
    }

    // The phone project is narrow already; the desktop one narrows to the
    // smallest phone the site is drawn for.
    if (info.project.name === 'fleet-desktop') {
      await page.setViewportSize({ width: 375, height: 812 });

      for (const path of paths) {
        await noSidewaysScroll(page, path);
      }
    }
  });
});
