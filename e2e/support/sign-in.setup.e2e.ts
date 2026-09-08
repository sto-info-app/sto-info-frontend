import { expect, test as setup } from '@playwright/test';

import { SIGNED_IN_STATE } from '../../playwright.config';
import { backend } from './backend';
import { member } from './member';

/**
 * Runs once, before any journey.
 *
 * Custom Tracking ships switched off, so the first thing to do is switch it
 * on. The second is to put this member back to never having used it: a journey
 * that finds last night's sections still there would be testing whatever state
 * the previous run happened to leave, which is not a test.
 *
 * Signing in happens through the login form rather than by writing a token
 * into storage, because a token written by hand is a guess at what the
 * application stores, and a guess that goes stale silently.
 */

setup('sign in and start from nothing', async ({ page }) => {
  backend.begin(member.email);

  await page.goto('/login');
  await page.getByLabel('Email').fill(member.email);
  await page.getByLabel('Password').fill(member.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: SIGNED_IN_STATE });
});
