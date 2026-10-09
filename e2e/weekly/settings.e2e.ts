import { expect, Locator, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';

/**
 * SETTINGS-01 and PROFILE-01.
 *
 * Actors: the demonstration member, and an anonymous reader of the registry.
 * Privacy Mode hides details on this screen. It does not change whether the
 * registry lists the member. The name and the publication flag are put back.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

/**
 * Writes a text field the way Angular's form hears it.
 *
 * Filling alone updates the box. The dialog's Save stays disabled until the
 * form control itself has changed.
 */
async function setInput(field: Locator, value: string): Promise<void> {
  await field.evaluate((element, next) => {
    const input = element as HTMLInputElement;
    input.focus();
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }, value);
}

test(
  'SETTINGS-01 privacy mode and the inactivity window, then both put back',
  {
    tag: '@weekly',
  },
  async ({ page, browser }) => {
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    const privacy = page.getByRole('switch', { name: 'Privacy Mode' });
    const timeout = page.getByLabel('Login inactivity timeout');
    const privacyBefore = await privacy.isChecked();
    const timeoutBefore = await timeout.locator('option:checked').innerText();

    try {
      if (!privacyBefore) {
        await privacy.click();
      }
      await timeout.selectOption({ label: '1 hour' });
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.reload();
      await expect(privacy).toBeChecked();
      await expect(timeout.locator('option:checked')).toHaveText('1 hour');

      const anonymous = await browser.newContext();
      const reader = await anonymous.newPage();

      try {
        await reader.goto(`/community/registry/profiles/${member.username}`);
        await expect(
          reader.getByRole('heading', { name: member.username }),
        ).toBeVisible();
      } finally {
        await anonymous.close();
      }
    } finally {
      await page.goto('/dashboard/settings');
      const privacyNow = await privacy.isChecked();
      if (privacyNow !== privacyBefore) {
        await privacy.click();
      }
      await timeout.selectOption({ label: timeoutBefore });
      if (
        await page
          .getByRole('button', { name: 'Save', exact: true })
          .isEnabled()
      ) {
        await page.getByRole('button', { name: 'Save', exact: true }).click();
      }
    }
  },
);

test(
  'PROFILE-01 personal details save, cancel, and the registry flag',
  {
    tag: '@weekly',
  },
  async ({ page, browser }) => {
    // The form rejects a hyphen, and this member's username has one, so Save
    // stays disabled until a temporary alphanumeric username is in place.
    const stored = backend.profileIdentity(member.email);
    const hold = 'e2eweekly';
    backend.writeProfileIdentity(
      member.email,
      hold,
      stored.firstName,
      stored.publiclyVisible ? 'public' : 'private',
    );

    const anonymous = await browser.newContext();

    try {
      await page.goto('/dashboard/profile');
      await expect(
        page.getByRole('heading', { name: 'Personnel Record' }),
      ).toBeVisible();

      await page.getByTitle('Edit Personal Details').click();
      const firstName = page.getByLabel('First Name');
      const publication = page.getByRole('switch', {
        name: 'Show me in the Galactic Personnel Registry',
      });
      await expect(firstName).not.toHaveValue('');
      const originalName = await firstName.inputValue();
      const publishedBefore = await publication.isChecked();

      await firstName.fill(`${originalName}e`.slice(0, 40));
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByTitle('Edit Personal Details').click();
      await expect(firstName).toHaveValue(originalName);

      const edited = originalName.endsWith('e')
        ? originalName.slice(0, -1)
        : `${originalName}e`;
      await setInput(firstName, edited.slice(0, 40));
      await expect(firstName).toHaveValue(edited.slice(0, 40));

      const save = page.getByRole('button', { name: 'Save', exact: true });
      await expect(save).toBeEnabled();
      await publication.click();
      await expect(save).toBeEnabled();
      await save.click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.reload();
      await expect(
        page.getByText(edited.slice(0, 40), { exact: false }),
      ).toBeVisible();

      const reader = await anonymous.newPage();
      await reader.goto(`/community/registry/profiles/${hold}`);
      if (publishedBefore) {
        await expect(
          reader.getByRole('heading', { name: 'Record not found' }),
        ).toBeVisible();
      } else {
        await expect(reader.getByRole('heading', { name: hold })).toBeVisible();
      }
    } finally {
      await anonymous.close();
      backend.writeProfileIdentity(
        member.email,
        stored.username,
        stored.firstName,
        stored.publiclyVisible ? 'public' : 'private',
      );
    }
  },
);
