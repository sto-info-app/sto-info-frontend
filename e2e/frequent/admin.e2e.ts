import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE, storageStateFor } from '../support/actors';

/**
 * ADMIN-01. An anonymous visitor is sent to login with the address kept.
 * A member is sent home and is not given the admin list. An administrator
 * sees the landing.
 *
 * Actors: anonymous, the demonstration member, the fixture administrator.
 */

test(
  'ADMIN-01 admin is login for a stranger, home for a member, and the landing for an administrator',
  { tag: '@high' },
  async ({ browser }) => {
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();

    try {
      await strangerPage.goto('/admin');
      await expect(strangerPage).toHaveURL(/\/login/);
      expect(decodeURIComponent(strangerPage.url())).toContain('/admin');
    } finally {
      await stranger.close();
    }

    const member = await browser.newContext({
      storageState: MEMBER_STORAGE_STATE,
    });
    const memberPage = await member.newPage();
    const seen: string[] = [];

    memberPage.on('response', response => {
      seen.push(response.url());
    });

    try {
      await memberPage.goto('/admin');
      await expect(memberPage).toHaveURL(/https?:\/\/[^/]+\/?(\?.*)?$/);
      await expect(
        memberPage.getByRole('heading', { name: /Welcome to the/ }),
      ).toBeVisible();
      await expect(memberPage.getByText('Manage News')).toHaveCount(0);
      expect(seen.some(url => url.includes('/news/admin'))).toBe(false);
    } finally {
      await member.close();
    }

    const admin = await browser.newContext({
      storageState: storageStateFor('ADM'),
    });
    const adminPage = await admin.newPage();

    try {
      await adminPage.goto('/admin');
      await expect(
        adminPage.getByRole('heading', { name: 'Admin', exact: true }),
      ).toBeVisible();
      await expect(adminPage).toHaveURL(/\/admin$/);
    } finally {
      await admin.close();
    }
  },
);
