import { expect, test } from '@playwright/test';

import { signIn } from '../support/login';
import { member } from '../support/member';

/**
 * AUTH-01 and AUTH-02.
 *
 * Actors: anonymous, then the demonstration member. AUTH-02 retries the real
 * password after the rejection, and must not have reached the dashboard on
 * the rejection itself.
 */

const RETURN_PATH = '/dashboard?from=e2e';

test(
  'AUTH-01 a protected address comes back whole after login, and logout closes it',
  { tag: '@high' },
  async ({ page }) => {
    await page.goto(RETURN_PATH);
    await expect(page).toHaveURL(/\/login/);
    expect(decodeURIComponent(page.url())).toContain(RETURN_PATH);

    await page.getByLabel('Email').fill(member.email);
    await page.getByLabel('Password').fill(member.password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\?from=e2e$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\?from=e2e$/);

    // The header control is an anchor without an href, so it is not a link.
    const logout = page.locator('#header-logout-link');
    await expect(logout).toBeVisible();
    await logout.click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  },
);

test(
  'AUTH-02 an empty, malformed or wrong login cannot reach the dashboard',
  { tag: '@high' },
  async ({ page }) => {
    await page.goto('/login');

    const submit = page.getByRole('button', { name: 'Login', exact: true });

    await expect(submit).toBeDisabled();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('anything');
    await expect(submit).toBeDisabled();

    await page.getByLabel('Email').fill(member.email);
    await page.getByLabel('Password').fill('incorrect-password');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByText('Unauthorised: Invalid email or password.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/dashboard/);

    await signIn(page, member.email, member.password);
    await expect(page).toHaveURL(/\/dashboard/);
  },
);
