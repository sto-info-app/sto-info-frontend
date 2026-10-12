import { expect, Locator, Page, Response } from '@playwright/test';

import { AuthLink, backend } from '../support/backend';
import { member } from '../support/member';

/**
 * Shared steps for the external mail cases.
 *
 * Addresses are `@example.com` and start with `e2eext`. The password is the
 * seed password and is never written out. A verification or reset link is
 * opened from the value stored on the account, not from a mailbox.
 */

/** How long a request may spend trying to send mail before it answers. */
export const MAIL_TIMEOUT = 90_000;

export interface ExternalAccount {
  email: string;
  username: string;
}

/** A fresh address and username for one case. */
export function externalAccount(suffix: string): ExternalAccount {
  const stamp = Date.now().toString(36);

  return {
    email: `e2eext${stamp}${suffix}@example.com`,
    username: `e2eext${stamp}${suffix}`,
  };
}

/**
 * A replacement password for the reset case.
 *
 * It has to differ from the seed password, and it has to satisfy the same
 * complexity rules. It is not logged.
 */
export function replacementPassword(): string {
  return `E2e${Date.now().toString(36)}Aa1!`;
}

/** A POST whose path ends with this suffix. */
export function postTo(path: string): (response: Response) => boolean {
  return response =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname.endsWith(path);
}

/**
 * Fill and submit registration.
 *
 * A successful response opens the complete page. A failure after the account
 * has been saved stays on the form: the link is still stored, and the caller
 * reads it. Either way this waits until the request has finished.
 */
export async function submitRegistration(
  page: Page,
  account: ExternalAccount,
  password: string,
): Promise<'complete' | 'stored'> {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  await page.getByLabel('First Name').fill('E2E');
  await page.getByLabel('Last Name').fill('External');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);

  const response = page.waitForResponse(postTo('/auth/register'), {
    timeout: MAIL_TIMEOUT,
  });
  await press(page.getByRole('button', { name: 'Register' }));
  const result = await response;
  const complete = page.getByRole('heading', { name: 'Registration Complete' });

  if (result.ok()) {
    await expect(complete).toBeVisible();
    return 'complete';
  }

  await expect(page).toHaveURL(/\/register\/?$/);
  await expect(complete).toHaveCount(0);

  return 'stored';
}

/** Open the stored verification link and click Verify Email. */
export async function submitVerification(
  page: Page,
  token: string,
): Promise<void> {
  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`, {
    waitUntil: 'domcontentloaded',
  });
  await press(page.getByRole('button', { name: 'Verify Email' }));
}

/**
 * Treat the account as verified when the screen says so, or when the welcome
 * message failed after the account had already been verified.
 */
export async function acceptVerification(
  page: Page,
  email: string,
): Promise<void> {
  const success = page.getByText('Verification successful! You can now login.');
  const failed = page.getByText('Verification failed. Please try again.');
  await expect(success.or(failed)).toBeVisible({ timeout: MAIL_TIMEOUT });

  if (await success.isVisible()) {
    return;
  }

  expect(backend.authLink(email).emailVerified).toBe(true);
}

/** Sign in and report whether the site accepted it. */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await press(page.getByRole('button', { name: 'Login', exact: true }));
}

/**
 * Click a control that may sit outside the viewport.
 *
 * Several LCARS actions are drawn past the visible page. Playwright's own
 * click then retries until it times out, while the control is still there
 * and enabled.
 */
export async function press(locator: Locator): Promise<void> {
  await locator.evaluate((element: HTMLElement) => element.click());
}

/**
 * Make the picture cropper produce a crop.
 *
 * The cropper crops on its own once, straight after the picture is sized, and
 * on a runner that first crop does not always land, so Upload stays disabled.
 * Changing the frame with the keyboard runs a fresh crop every time, which is
 * what a member nudging the frame does. The frame is resized rather than
 * moved: a frame that already fills the picture cannot move, and an unmoved
 * frame crops nothing. Shift makes the arrow a resize and Alt inverts the
 * edge, so this pulls the left edge inward by a few pixels.
 */
export async function nudgeCrop(page: Page): Promise<void> {
  const frame = page.locator('.ngx-ic-cropper');
  const preview = page.locator(
    '#cropped-image-preview, #storytime-cropped-image-preview',
  );
  await expect(frame).toBeVisible();

  // One press is not always enough straight after the picture lands, so
  // press until the dialog shows the crop it will send.
  await expect(async () => {
    await frame.focus();
    await page.keyboard.press('Shift+Alt+ArrowRight');
    await expect(preview).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

/** The seed password, read once so a case does not log the lookup. */
export function seedPassword(): string {
  return member.password;
}

/** The stored verification token, or a failure that does not print the row. */
export function verificationToken(email: string): string {
  return requiredToken(backend.authLink(email), 'verification');
}

/** The stored reset token, or a failure that does not print the row. */
export function resetToken(email: string): string {
  return requiredToken(backend.authLink(email), 'reset');
}

function requiredToken(link: AuthLink, kind: 'verification' | 'reset'): string {
  const token =
    kind === 'verification' ? link.verificationToken : link.resetToken;

  if (!token) {
    throw new Error(`No ${kind} link was stored for that account.`);
  }

  return token;
}
