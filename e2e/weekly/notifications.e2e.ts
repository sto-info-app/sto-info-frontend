import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE, storageStateFor } from '../support/actors';

/**
 * NOTIFY-01. An administrator sends two in-app notifications to the
 * demonstration member. One link stays inside the site. The other opens
 * off-site and is marked so a new tab cannot reach back.
 *
 * Actors: the fixture administrator, then the demonstration member.
 */

test(
  'NOTIFY-01 read, unread, mark all read, and both kinds of link',
  {
    tag: '@weekly',
  },
  async ({ browser }) => {
    const stamp = Date.now().toString(36);
    const internalTitle = `E2E Weekly internal ${stamp}`;
    const externalTitle = `E2E Weekly external ${stamp}`;
    const internalUrl = 'http://localhost:4201/about';

    const admin = await browser.newContext({
      storageState: storageStateFor('ADM'),
    });
    const adminPage = await admin.newPage();

    await send(adminPage, 'demo-user-014', internalTitle, internalUrl);
    await send(
      adminPage,
      'demo-user-014',
      externalTitle,
      'https://example.com/weekly',
    );
    await admin.close();

    const member = await browser.newContext({
      storageState: MEMBER_STORAGE_STATE,
    });
    const page = await member.newPage();

    try {
      await page.goto('/notifications');
      await expect(
        page.getByRole('heading', { name: 'Notifications' }),
      ).toBeVisible();
      await expect(page.getByText(internalTitle)).toBeVisible();
      await expect(page.getByText(externalTitle)).toBeVisible();

      const external = page
        .locator('li.notification-card')
        .filter({ hasText: externalTitle })
        .getByRole('link', { name: /External:/ });
      await expect(external).toHaveAttribute('target', '_blank');
      await expect(external).toHaveAttribute('rel', 'noopener');

      const internal = page
        .locator('li.notification-card')
        .filter({ hasText: internalTitle })
        .getByRole('link', { name: /Internal:/ });
      await internal.click();
      await expect(page).toHaveURL(/\/about/);

      await page.goto('/notifications');
      const toggle = page.getByRole('button', { name: 'Mark as read' }).first();
      await toggle.click();
      await expect(
        page.getByRole('button', { name: 'Mark as unread' }).first(),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Mark all read' }).click();
      await expect(
        page.getByRole('button', { name: 'Mark as read' }),
      ).toHaveCount(0);
    } finally {
      await member.close();
    }
  },
);

async function send(
  page: import('@playwright/test').Page,
  username: string,
  title: string,
  link: string,
): Promise<void> {
  await page.goto('/admin/notifications/send');
  await page.getByLabel('Audience').selectOption({ label: 'Single user' });
  await page.getByRole('button', { name: 'Search and select' }).click();
  await page.getByLabel('Search').fill(username);
  await page
    .getByRole('button', { name: new RegExp(username) })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Body').fill('Weekly notification.');
  await page.getByLabel('Link URL').fill(link);
  const sent = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      response.ok() &&
      response.url().includes('notification'),
  );
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await sent;
  await expect(page.getByText(title)).toBeVisible();
}
