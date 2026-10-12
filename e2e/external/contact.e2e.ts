import { expect, test } from '@playwright/test';

import { backend } from '../support/backend';
import { MAIL_TIMEOUT, press } from './account';

/**
 * CONTACT-01.
 *
 * The address is `@example.com`. The case reads the saved request rather than
 * a mailbox. A send failure after the save leaves the form filled and Send
 * enabled again. A successful send shows the confirmation and clears the form.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test(
  'CONTACT-01 a contact request is saved, whether or not the mail goes out',
  { tag: '@external' },
  async ({ page }) => {
    test.setTimeout(300_000);

    const message = `E2E external contact ${Date.now().toString(36)}`;

    try {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: 'Contact us' }),
      ).toBeVisible();

      await page.getByLabel('Name').focus();
      await page.getByLabel('Name').blur();
      await expect(page.getByText('Name is required.')).toBeVisible();
      await page.getByLabel('Email').fill('not-an-email');
      await page.getByLabel('Email').blur();
      await expect(page.getByText('Invalid email format.')).toBeVisible();
      await page.getByLabel('Topic').focus();
      await page.getByLabel('Topic').blur();
      await expect(page.getByText('Please select a topic.')).toBeVisible();
      await page.getByLabel('Message').focus();
      await page.getByLabel('Message').blur();
      await expect(page.getByText('A message is required.')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled();

      await page.getByLabel('Name').fill('E2E External');
      await page
        .getByLabel('Email')
        .fill(`e2eext${Date.now().toString(36)}@example.com`);
      await page.getByLabel('Topic').selectOption({ label: 'Feedback' });
      await page.getByLabel('Message').fill(message);
      await expect(
        page.getByRole('button', { name: 'Send message' }),
      ).toBeEnabled();
      await press(page.getByRole('button', { name: 'Send message' }));

      const sent = page.getByText(
        'Thanks for reaching out. Your message has been received and a confirmation email is on its way.',
      );
      const failed = page.getByText(
        'Unable to send your message right now. Please try again soon.',
      );
      await expect(sent.or(failed)).toBeVisible({ timeout: MAIL_TIMEOUT });

      if (await sent.isVisible()) {
        await expect(page.getByLabel('Name')).toHaveValue('');
        await expect(page.getByLabel('Message')).toHaveValue('');
      } else {
        await expect(page.getByLabel('Name')).toHaveValue('E2E External');
        await expect(page.getByLabel('Message')).toHaveValue(message);
        await expect(
          page.getByRole('button', { name: 'Send message' }),
        ).toBeEnabled();
      }

      const stored = backend.contactLatest(message);
      expect(stored.name).toBe('E2E External');
      expect(stored.topic).toBe('feedback');
      expect(stored.message).toBe(message);
    } finally {
      backend.discardContact(message);
    }
  },
);
