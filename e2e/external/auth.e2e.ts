import { expect, Page, test } from '@playwright/test';

import { backend } from '../support/backend';
import {
  acceptVerification,
  externalAccount,
  login,
  MAIL_TIMEOUT,
  press,
  replacementPassword,
  resetToken,
  seedPassword,
  submitRegistration,
  submitVerification,
  verificationToken,
} from './account';

/**
 * AUTH-03 and AUTH-04.
 *
 * Addresses are `@example.com`. The link is the one stored when the form is
 * submitted. A send failure after that save does not stop the case, and the
 * complete page is still required when the request itself succeeds.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test(
  'AUTH-03 registration stores a verification link and then signs in',
  { tag: '@external' },
  async ({ page }) => {
    test.setTimeout(900_000);

    backend.clearAuthLimit();
    const password = seedPassword();
    const first = externalAccount('a');
    const second = externalAccount('b');

    try {
      await page.goto('/register', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('First Name').focus();
      await page.getByLabel('First Name').blur();
      await expect(page.getByText('First Name is required.')).toBeVisible();
      await page.getByLabel('Username').focus();
      await page.getByLabel('Username').blur();
      await expect(page.getByText('Username is required.')).toBeVisible();
      await page.getByLabel('Email').focus();
      await page.getByLabel('Email').blur();
      await expect(
        page.getByText('An email address is required.'),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Register' }),
      ).toBeDisabled();

      await page.getByLabel('First Name').fill('E2E');
      await page.getByLabel('Last Name').fill('External');
      await page.getByLabel('Username').fill(first.username);
      await page.getByLabel('Email').fill(first.email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByLabel('Confirm Password').fill(`${password}x`);
      await page.getByLabel('Confirm Password').blur();
      await expect(page.getByText('Passwords do not match.')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Register' }),
      ).toBeDisabled();

      const firstOutcome = await submitRegistration(page, first, password);
      const firstToken = verificationToken(first.email);

      if (firstOutcome === 'complete') {
        await expect(
          page.getByText('Congratulations, you have successfully registered.'),
        ).toBeVisible();
      }

      await login(page, first.email, password);
      await expect(
        page.getByText(
          'Please verify your email before logging in. Check your inbox for the verification email.',
        ),
      ).toBeVisible();

      await submitRegistration(
        page,
        { email: first.email, username: `${first.username}x` },
        password,
      );
      await expect(
        page.getByText('This email address is already registered.'),
      ).toBeVisible();

      await submitRegistration(
        page,
        { email: second.email, username: first.username },
        password,
      );
      await expect(page.getByText('Username is already taken.')).toBeVisible();

      await page.goto('/verify-email', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Invalid token!')).toBeVisible();

      await page.goto('/verify-email?token=not-a-real-token', {
        waitUntil: 'domcontentloaded',
      });
      await page.getByRole('button', { name: 'Verify Email' }).click();
      await expect(
        page.getByText('Verification failed. Please try again.'),
      ).toBeVisible();

      backend.expireAuthLink(first.email, 'verification');
      await submitVerification(page, firstToken);
      await expect(
        page.getByText('Your verification link has expired'),
      ).toBeVisible();

      const secondOutcome = await submitRegistration(page, second, password);
      const secondToken = verificationToken(second.email);

      if (secondOutcome === 'complete') {
        await expect(
          page.getByRole('heading', { name: 'Registration Complete' }),
        ).toBeVisible();
      }

      await submitVerification(page, secondToken);
      await acceptVerification(page, second.email);
      await login(page, second.email, password);
      await expect(page).not.toHaveURL(/\/login/);
    } finally {
      backend.discardExternal(first.email);
      backend.discardExternal(second.email);
    }
  },
);

test(
  'AUTH-04 a stored reset link replaces the password once',
  { tag: '@external' },
  async ({ page }) => {
    test.setTimeout(900_000);

    backend.clearAuthLimit();
    const password = seedPassword();
    const replacement = replacementPassword();
    const account = externalAccount('c');

    try {
      await submitRegistration(page, account, password);
      await submitVerification(page, verificationToken(account.email));
      await acceptVerification(page, account.email);

      await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email').fill(`e2eextmissing@example.com`);
      await press(page.getByRole('button', { name: 'Reset Password' }));
      await expect(page.getByText('Invalid request')).toBeVisible({
        timeout: MAIL_TIMEOUT,
      });

      await requestReset(page, account.email);
      const token = resetToken(account.email);

      await page.goto('/change-password?token=not-a-real-token', {
        waitUntil: 'domcontentloaded',
      });
      await fillChange(page, replacement);
      await expect(resetRejected(page)).toBeVisible();

      await page.goto(`/change-password?token=${encodeURIComponent(token)}`, {
        waitUntil: 'domcontentloaded',
      });
      await fillChange(page, replacement);
      await expect(passwordChanged(page)).toBeVisible({
        timeout: MAIL_TIMEOUT,
      });

      await login(page, account.email, password);
      await expect(
        page.getByText('Unauthorised: Invalid email or password.'),
      ).toBeVisible();

      await login(page, account.email, replacement);
      await expect(page).not.toHaveURL(/\/login/);

      await page.goto(`/change-password?token=${encodeURIComponent(token)}`, {
        waitUntil: 'domcontentloaded',
      });
      await fillChange(page, replacementPassword());
      await expect(resetRejected(page)).toBeVisible();

      await requestReset(page, account.email);
      const expired = resetToken(account.email);
      backend.expireAuthLink(account.email, 'reset');
      await page.goto(`/change-password?token=${encodeURIComponent(expired)}`, {
        waitUntil: 'domcontentloaded',
      });
      await fillChange(page, replacementPassword());
      await expect(resetRejected(page)).toBeVisible();
    } finally {
      backend.discardExternal(account.email);
    }
  },
);

async function requestReset(page: Page, email: string): Promise<void> {
  await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await press(page.getByRole('button', { name: 'Reset Password' }));
  await expect(
    page
      .getByText(
        'Check your email and follow the instructions to reset your password.',
      )
      .or(page.locator('app-lcars-error-message')),
  ).toBeVisible({ timeout: MAIL_TIMEOUT });
}

async function fillChange(page: Page, password: string): Promise<void> {
  await page.getByLabel('New Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm New Password').fill(password);
  await press(page.getByRole('button', { name: 'Change Password' }));
}

function passwordChanged(page: Page) {
  return page
    .getByText('Your password has been changed successfully.')
    .or(
      page.getByText(
        'There was an error changing your password. Please try again in a moment.',
      ),
    );
}

function resetRejected(page: Page) {
  return page.getByText(
    'Your password reset link is invalid or has expired. Please request a new reset email.',
  );
}
