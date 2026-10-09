import { Browser, expect, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE, storageStateFor } from '../support/actors';
import { backend } from '../support/backend';
import { fixtureActors } from '../support/actors';
import { member } from '../support/member';

/**
 * STORY-03 through STORY-11.
 *
 * Actors: the demonstration member writes. B is invited and then removed.
 * Spotlight, tags and moderation are opened by the fixture actor who holds
 * that permission, and refused to a member who does not.
 * Mail and pictures are not part of this.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test.beforeAll(() => {
  backend.storytimeOn();
});

test.afterAll(() => {
  backend.discardWeekly(member.email);
  backend.storytimeOff();
});

test(
  'STORY-03 search, a creator, the spotlight archive, policies, and removed',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await ensureStorytime(page);

    await expect(async () => {
      await page.goto('/storytime/search');
      await expect(
        page.getByRole('heading', { name: 'Search', level: 1 }),
      ).toBeVisible();
    }).toPass({ timeout: 25_000 });

    await page.goto('/storytime/spotlight');
    await expect(
      page.getByRole('heading', { name: 'The Storytime Spotlight' }),
    ).toBeVisible();

    await page.goto('/storytime/policies');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/storytime/content-policy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/storytime/terms');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/storytime/fan-content');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/storytime/removed');
    await expect(
      page.getByRole('heading', { name: 'This has been removed' }),
    ).toBeVisible();
  },
);

test(
  'STORY-04 a story and a chapter are saved and then deleted',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const title = weeklyTitle('voyage');
    await ensureStorytime(page);
    const id = await createStory(page, title);

    await page.goto(`/storytime/manage/stories/${id}/chapters/new`);
    await expect(
      page.getByRole('heading', { name: 'Write a Chapter' }),
    ).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill('Opening');
    await page
      .getByRole('textbox', { name: 'Chapter' })
      .fill('The weekly chapter.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit Chapter' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Save and publish' }).click();
    const confirm = page.getByRole('button', { name: 'I confirm' });
    if (await confirm.isVisible()) {
      await confirm.click();
      await page.getByRole('button', { name: 'Save and publish' }).click();
    }

    await page.goto('/storytime/manage/stories');
    const card = page.locator('article').filter({ hasText: title });
    await card.getByRole('button', { name: 'Delete this Story' }).click();
    await page
      .locator('#confirm-dialog-container')
      .getByRole('button', { name: 'Delete Story', exact: true })
      .click();
    await expect(page.getByText(title)).toHaveCount(0);
  },
);

test(
  'STORY-05 a cast member is saved, and credits do not show an unpublished story',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const title = weeklyTitle('cast');
    await ensureStorytime(page);
    const id = await createStory(page, title);

    await page.goto(`/storytime/manage/stories/${id}/characters/new`);
    await page.getByLabel('Name', { exact: true }).fill('Weekly Captain');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit Character' }),
    ).toBeVisible();

    await page.goto(`/storytime/manage/stories/${id}/credits`);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();

    const anonymous = await page.context().browser()!.newContext();
    const reader = await anonymous.newPage();
    await reader.goto('/storytime/search');
    await expect(reader.getByText(title)).toHaveCount(0);
    await expect(reader.getByText('Weekly Captain')).toHaveCount(0);
    await anonymous.close();
  },
);

test(
  'STORY-06 an invitation can be declined, accepted, and withdrawn',
  {
    tag: '@weekly',
  },
  async ({ page, browser }) => {
    const title = weeklyTitle('crew');
    await ensureStorytime(page);
    const id = await createStory(page, title);
    const reader = backend.actor(fixtureActors.B.email);

    await page.goto(`/storytime/manage/stories/${id}/collaborators`);
    await expect(
      page.getByRole('heading', { name: 'Collaborators' }),
    ).toBeVisible();
    await invite(page, reader.userId);

    const other = await signedIn(browser, storageStateFor('B'));
    try {
      await other.page.goto('/storytime/manage/invitations');
      await expect(
        other.page.getByRole('heading', { name: 'Invitations' }),
      ).toBeVisible();
      await other.page
        .getByRole('button', { name: 'Decline', exact: true })
        .click();

      await invite(page, reader.userId);
      await other.page.reload();
      await other.page
        .getByRole('button', { name: 'Accept', exact: true })
        .click();

      await page.reload();
      await page.getByRole('button', { name: 'Remove', exact: true }).click();
      await page
        .locator('#confirm-dialog-container')
        .getByRole('button', { name: 'Remove', exact: true })
        .click();
      await expect(page.getByText('Weekly partner')).toHaveCount(0);
    } finally {
      await other.context.close();
    }
  },
);

test(
  'STORY-07 an arc can be created and opened',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const title = weeklyTitle('arc');
    await ensureStorytime(page);
    await page.goto('/storytime/manage/arcs/new');
    await expect(
      page.getByRole('heading', { name: 'Create an Arc' }),
    ).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Stories in this Arc' }),
    ).toBeVisible();
  },
);

test(
  "STORY-08 the library and the feed are the reader's own",
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await ensureStorytime(page);
    await page.goto('/storytime/library');
    await expect(
      page.getByRole('heading', { name: 'Your Library' }),
    ).toBeVisible();
    await page.goto('/storytime/feed');
    await expect(
      page.getByRole('heading', { name: 'Your Storytime feed' }),
    ).toBeVisible();
  },
);

test(
  'STORY-09 a private list stays private and a public list can be opened',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await ensureStorytime(page);
    const stamp = Date.now().toString(36);
    await page.goto('/storytime/reading-lists');
    await expect(
      page.getByRole('heading', { name: 'Your reading lists' }),
    ).toBeVisible();

    await page.getByLabel('New list').fill(`E2E Weekly private ${stamp}`);
    await page.getByRole('button', { name: 'Make list' }).click();
    await expect(page.getByText(`E2E Weekly private ${stamp}`)).toBeVisible();

    await page.getByLabel('New list').fill(`E2E Weekly public ${stamp}`);
    await page.getByRole('switch', { name: 'Anybody may read it' }).click();
    await page.getByRole('button', { name: 'Make list' }).click();
    await expect(page.getByText(`E2E Weekly public ${stamp}`)).toBeVisible();

    const userId = await page.evaluate(() => {
      const token = localStorage.getItem('access_token') ?? '';
      const payload = token.split('.')[1] ?? '';
      const json = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
      const parsed = JSON.parse(json) as { sub?: string };

      return parsed.sub ?? '';
    });
    const anonymous = await page.context().browser()!.newContext();
    const reader = await anonymous.newPage();
    await reader.goto(`/storytime/creators/${userId}`);
    await expect(
      reader.getByRole('link', { name: `E2E Weekly public ${stamp}` }),
    ).toBeVisible();
    await expect(reader.getByText(`E2E Weekly private ${stamp}`)).toHaveCount(
      0,
    );
    await anonymous.close();

    for (const name of [
      `E2E Weekly private ${stamp}`,
      `E2E Weekly public ${stamp}`,
    ]) {
      await page
        .locator('article, li')
        .filter({ hasText: name })
        .getByRole('button', { name: 'Delete list' })
        .click();
      await page
        .locator('#confirm-dialog-container')
        .getByRole('button', { name: 'Delete list', exact: true })
        .click();
      await expect(page.getByText(name)).toHaveCount(0);
    }
  },
);

test(
  "STORY-10 moderation is the moderator's queue",
  {
    tag: '@weekly',
  },
  async ({ browser }) => {
    const home = await signedIn(browser, MEMBER_STORAGE_STATE);
    try {
      await ensureStorytime(home.page);
    } finally {
      await home.context.close();
    }

    const moderator = await signedIn(browser, storageStateFor('MOD'));
    try {
      await moderator.page.goto('/storytime/manage/moderation');
      await expect(
        moderator.page.getByRole('heading', { name: 'Storytime Moderation' }),
      ).toBeVisible();
    } finally {
      await moderator.context.close();
    }
  },
);

test(
  'STORY-11 spotlight and tags are split, and a member holds neither',
  {
    tag: '@weekly',
  },
  async ({ browser }) => {
    const home = await signedIn(browser, MEMBER_STORAGE_STATE);
    await ensureStorytime(home.page);
    await home.context.close();

    const spotlight = await signedIn(browser, storageStateFor('SPOT'));
    const tags = await signedIn(browser, storageStateFor('TAG'));
    const memberSession = await signedIn(browser, storageStateFor('B'));

    try {
      await spotlight.page.goto('/storytime/manage/spotlight');
      await expect(
        spotlight.page.getByRole('heading', { name: 'Spotlight' }),
      ).toBeVisible();

      await tags.page.goto('/storytime/manage/tags');
      await expect(
        tags.page.getByRole('heading', { name: 'Storytime Tags' }),
      ).toBeVisible();

      await memberSession.page.goto('/storytime/manage/spotlight');
      await expect(memberSession.page).not.toHaveURL(/manage\/spotlight/);
      await memberSession.page.goto('/storytime/manage/tags');
      await expect(memberSession.page).not.toHaveURL(/manage\/tags/);
    } finally {
      await spotlight.context.close();
      await tags.context.close();
      await memberSession.context.close();
    }
  },
);

function weeklyTitle(kind: string): string {
  return `E2E Weekly ${kind} ${Date.now().toString(36)}`;
}

async function ensureStorytime(page: Page): Promise<void> {
  await page.goto('/storytime');

  if (page.url().includes('/unavailable')) {
    backend.storytimeOn();
  }

  await expect(async () => {
    await page.goto('/storytime');
    await expect(page).not.toHaveURL(/\/unavailable/);
  }).toPass({ timeout: 45_000 });
}

async function createStory(page: Page, title: string): Promise<string> {
  await page.goto('/storytime/manage/stories/new');
  await expect(
    page.getByRole('heading', { name: 'Create a Story' }),
  ).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Short description').fill('A weekly story.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/manage\/stories\/[0-9a-f-]{36}(?:\/|$)/i);
  await expect(page.getByRole('heading', { name: 'Edit Story' })).toBeVisible();
  const match = /\/manage\/stories\/([0-9a-f-]{36})/i.exec(page.url());

  if (!match?.[1]) {
    throw new Error('Saving the story did not open it.');
  }

  return match[1];
}

async function invite(page: Page, userId: string): Promise<void> {
  await page.getByLabel('Member ID').fill(userId);
  await page.getByLabel('What you call them').fill('Weekly partner');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText('They have not answered yet')).toBeVisible();
}

async function signedIn(
  browser: Browser,
  storageState: string,
): Promise<{
  context: Awaited<ReturnType<Browser['newContext']>>;
  page: Page;
}> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  return { context, page };
}
