import { resolve } from 'node:path';

import { expect, Page } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The signed-in checks owed by FC-027, FC-029 and FC-049 (FC-044): a Fleet's
 * news written, covered, published, searched, kept from the wrong readers,
 * renamed, unpublished and deleted, with a brief pass on a Community's; the
 * activity that publishing, joining and roles leave, for whoever may see it,
 * and on the Dashboard; Settings and its guides leading to each other; and
 * none of those pages scrolling sideways, down to 375px.
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
  let communityPostTitle: string;

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
    await dialog.getByRole('button', { name: 'Upload' }).click();
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

    const membersPath = new URL(owner.url()).pathname;

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
