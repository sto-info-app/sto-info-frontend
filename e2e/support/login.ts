import { expect, Page } from '@playwright/test';

/**
 * Sign in through the login form.
 *
 * The session is whatever the application stores after a real login. Nothing
 * here writes a token by hand.
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
