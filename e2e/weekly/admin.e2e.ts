import { expect, Page, test } from '@playwright/test';

import { storageStateFor } from '../support/actors';
import { backend } from '../support/backend';
import { fixtureActors } from '../support/actors';

/**
 * ADMIN-02, ADMIN-03, ADMIN-04 and ADMIN-05.
 *
 * Actors: the fixture administrator, and member B for the grant and the
 * disable. Notifications here are in-app. Nothing is emailed.
 * The post, the banner, the grant and the disabled flag are removed again.
 */

const adminState = storageStateFor('ADM');

test.use({ storageState: adminState });

test(
  'ADMIN-02 a news post is created, published, edited, and deleted',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const title = `E2E Weekly bulletin ${Date.now().toString(36)}`;

    try {
      await page.goto('/admin/news/add', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: 'New post' }),
      ).toBeVisible();
      await page.getByLabel('Title').fill(title);
      await page.getByLabel('Summary').fill('A weekly bulletin.');
      await page
        .getByLabel('Markdown Content')
        .fill('Hello from the weekly suite.');
      await page.getByLabel('Status').selectOption({ label: 'Published' });
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Manage News' }),
      ).toBeVisible();

      const article = page.locator('article').filter({ hasText: title });
      await expect(article.getByText('PUBLISHED')).toBeVisible();
      await article.getByRole('link', { name: 'Edit post' }).click();
      await expect(
        page.getByRole('heading', { name: 'Edit post' }),
      ).toBeVisible();
      await page.getByLabel('Summary').fill('A weekly bulletin, edited.');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page
          .locator('article')
          .filter({ hasText: title })
          .getByText('A weekly bulletin, edited.'),
      ).toBeVisible();

      const reader = await page.context().browser()!.newPage();
      // The public list can still be the copy from just before this post
      // existed. Another visit picks up the published one.
      await expect(async () => {
        await reader.goto('/news', { waitUntil: 'domcontentloaded' });
        await expect(
          reader.getByRole('link', { name: title, exact: true }),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 25_000 });
      await reader.close();
    } finally {
      await page.goto('/admin/news', { waitUntil: 'domcontentloaded' });
      const leftover = page.locator('article').filter({
        hasText: 'E2E Weekly bulletin',
      });

      while ((await leftover.count()) > 0) {
        const remaining = await leftover.count();
        await leftover
          .first()
          .getByRole('button', { name: 'Delete post' })
          .click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        await expect(leftover).toHaveCount(remaining - 1);
      }
    }
  },
);

test(
  'ADMIN-03 a banner and an in-app notification for one fixture member',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const title = `E2E Weekly banner ${Date.now().toString(36)}`;
    const notice = `E2E Weekly notice ${Date.now().toString(36)}`;

    try {
      await page.goto('/admin/banners/add', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Title').fill(title);
      await page.getByLabel('Message').fill('Visible to the weekly suite.');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(title).first()).toBeVisible();

      await page.goto('/admin/notifications/send', {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        page.getByRole('heading', { name: 'Send Notification' }),
      ).toBeVisible();
      await page.getByLabel('Audience').selectOption({ label: 'Single user' });
      await page
        .getByRole('button', { name: 'Search and select' })
        .evaluate((element: HTMLElement) => element.click());
      await page.getByLabel('Search').fill('e2e-member-b');
      await page
        .getByRole('button', { name: /e2e-member-b/ })
        .first()
        .click();
      await page.getByLabel('Title').fill(notice);
      await page.getByLabel('Body').fill('This stays inside the application.');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.getByText(/sent/i).first()).toBeVisible();
    } finally {
      await page.goto('/admin/banners', { waitUntil: 'domcontentloaded' });
      if (await page.getByText(title).count()) {
        await page
          .locator('li, tr, article')
          .filter({ hasText: title })
          .getByRole('button', { name: 'Delete banner' })
          .click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
      }
    }
  },
);

test(
  'ADMIN-04 a report, then disable and re-enable a fixture member',
  {
    tag: '@weekly',
  },
  async ({ page, browser }) => {
    test.setTimeout(360_000);
    const reported = 'e2e-member-b';
    // The personal-details form will not save a hyphenated username, so the
    // registry listing is arranged here and put back afterwards.
    const profile = backend.profileIdentity(fixtureActors.B.email);
    backend.writeProfileIdentity(
      fixtureActors.B.email,
      profile.username,
      profile.firstName,
      'public',
    );

    try {
      const reporter = await browser.newContext({
        storageState: storageStateFor('M'),
      });
      const reporterPage = await reporter.newPage();
      await reporterPage.goto(`/community/registry/profiles/${reported}`, {
        waitUntil: 'domcontentloaded',
      });
      await reporterPage
        .getByRole('button', { name: 'Report', exact: true })
        .click();
      await reporterPage
        .getByLabel(/What happened/)
        .fill('Weekly suite report. Please ignore.');
      await reporterPage.getByRole('button', { name: 'Send Report' }).click();
      await expect(
        reporterPage.getByText(
          /Your report has been sent to the administrators\.|You have already reported this officer/,
        ),
      ).toBeVisible();
      await reporter.close();

      await page.goto('/admin/reports', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: 'Reported Officers' }),
      ).toBeVisible();

      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      const memberSearch = page.getByLabel('Search by email or username');
      await memberSearch.fill(reported);
      await memberSearch.press('Enter');
      const memberCard = page.locator('article').filter({ hasText: reported });
      await expect(memberCard).toHaveCount(1);
      await memberCard
        .getByRole('button', { name: 'Disable this account' })
        .evaluate((element: HTMLElement) => element.click());
      await page.getByRole('button', { name: 'Disable', exact: true }).click();
      await expect(page.getByText('Disabled').first()).toBeVisible();
      expect(backend.actor(fixtureActors.B.email).isAccountDisabled).toBe(true);

      await memberCard
        .getByRole('button', { name: 'Restore this account' })
        .evaluate((element: HTMLElement) => element.click());
      await page.getByRole('button', { name: 'Restore', exact: true }).click();
      await expect(
        page.getByText(`${reported}'s account was restored.`),
      ).toBeVisible();
      expect(backend.actor(fixtureActors.B.email).isAccountDisabled).toBe(
        false,
      );
    } finally {
      if (backend.actor(fixtureActors.B.email).isAccountDisabled) {
        backend.setDisabled(fixtureActors.B.email, 'off');
      }
      backend.writeProfileIdentity(
        fixtureActors.B.email,
        profile.username,
        profile.firstName,
        profile.publiclyVisible ? 'public' : 'private',
      );
    }
  },
);

test(
  'ADMIN-05 a grant is visible to a fresh session and a member cannot grant',
  {
    tag: '@weekly',
  },
  async ({ page, browser }) => {
    const username = 'e2e-member-b';

    try {
      await openMember(page, username);
      await withdrawOverride(page, 'storytime.tag.manage');
      await page.getByLabel('Permission').selectOption('storytime.tag.manage');
      await page.getByLabel('Effect').selectOption({ label: 'Grant' });
      await page.getByLabel('Reason').fill('Weekly suite grant');
      await page.getByRole('button', { name: 'Apply override' }).click();
      await expect(page.getByText('Weekly suite grant')).toBeVisible();

      backend.storytimeOn();
      const granted = await browser.newContext({
        storageState: storageStateFor('B'),
      });
      const grantedPage = await granted.newPage();
      await expect(async () => {
        await grantedPage.goto('/storytime/manage/tags');
        await expect(
          grantedPage.getByRole('heading', { name: 'Storytime Tags' }),
        ).toBeVisible();
      }).toPass({ timeout: 25_000 });
      await grantedPage.goto('/admin/permissions');
      await expect(grantedPage).not.toHaveURL(/\/admin\/permissions/);
      await granted.close();
    } finally {
      await openMember(page, username);
      await withdrawOverride(page, 'storytime.tag.manage');
      backend.storytimeOff();
    }
  },
);

/**
 * Opens one member on the permissions screen.
 *
 * The Search button sits outside the viewport on this layout. Enter on the
 * field runs the same search.
 */
async function openMember(page: Page, username: string): Promise<void> {
  await page.goto('/admin/permissions', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Manage Permissions' }),
  ).toBeVisible();
  const search = page.getByLabel('Search by email or username');
  await search.fill(username);
  await search.press('Enter');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
}

/**
 * Confirms withdrawal of one override, when that override is on the open member.
 *
 * @param page - The admin permissions page, with a member already open.
 * @param permission - Permission code shown on the override row.
 */
async function withdrawOverride(page: Page, permission: string): Promise<void> {
  const code = page.locator('code.permission-code', { hasText: permission });
  await expect(code).toBeVisible();

  const withdraw = page
    .locator('article')
    .filter({ hasText: permission })
    .getByRole('button', { name: 'Withdraw' });
  if ((await withdraw.count()) === 0) {
    return;
  }

  await withdraw.click();
  await page
    .locator('#confirm-dialog-container')
    .getByRole('button', { name: 'Withdraw', exact: true })
    .click();
  await expect(page.getByText(/was withdrawn/)).toBeVisible();
  await expect(withdraw).toHaveCount(0);
}
