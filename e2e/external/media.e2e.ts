import { resolve } from 'node:path';

import { expect, Locator, Page, test } from '@playwright/test';

import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug } from '../support/snapshot';
import { press } from './account';

/**
 * MEDIA-01.
 *
 * Profile and character pictures use the same crop dialog as the product.
 * There is no remove control: Close leaves the stored picture, and replacing
 * one deletes the previous Cloudflare image. The last upload is deleted
 * afterwards through that same delete. A file that is not a jpeg or png is
 * refused by the dialog. The case is skipped unless E2E_IMAGES=on.
 */

const PICTURE = resolve('e2e/fixtures/picture.png');

test.skip(
  process.env['E2E_IMAGES'] !== 'on',
  'Uploads reach Cloudflare Images and the virus scanner. Set E2E_IMAGES=on to run it.',
);

test(
  'MEDIA-01 a personnel picture and a character picture can be cropped and replaced',
  { tag: '@external' },
  async ({ page }) => {
    test.setTimeout(600_000);

    const shot = backend.snapshot(member.email);
    const account = accountBySlug(shot, member.publicAccount);
    const captain = account.characters[0];

    if (!captain) {
      throw new Error('The public demonstration account has no captain.');
    }

    let uploadedProfile = false;
    let uploadedCharacter = false;

    try {
      await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' });
      const personnel = page.locator('#personnel-image img');
      const before = await personnel.getAttribute('src');

      await openPhoto(page, 'Edit Photo');
      await page.getByLabel('Select a new profile picture').setInputFiles({
        name: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an image'),
      });
      await expect(
        page.getByText(/Failed to load image|Invalid image type/),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled();
      await press(page.getByRole('button', { name: 'Close' }));
      await expect(personnel).toHaveAttribute('src', before ?? '');

      await openPhoto(page, 'Edit Photo');
      await uploadCrop(page, PICTURE);
      uploadedProfile = true;
      await expect(personnel).not.toHaveAttribute('alt', 'Unavailable');
      const uploaded = await personnel.getAttribute('src');
      expect(uploaded).toBeTruthy();
      expect(uploaded).not.toBe(before);

      await openPhoto(page, 'Edit Photo');
      await page
        .getByLabel('Select a new profile picture')
        .setInputFiles(PICTURE);
      await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled({
        timeout: 30_000,
      });
      await press(page.getByRole('button', { name: 'Close' }));
      await expect(personnel).toHaveAttribute('src', uploaded ?? '');

      await openPhoto(page, 'Edit Photo');
      await uploadCrop(page, PICTURE);
      await expect(personnel).not.toHaveAttribute('src', uploaded ?? '');

      await page.goto(
        `/dashboard/accounts/${account.handle}/${captain.handle}`,
        {
          waitUntil: 'domcontentloaded',
        },
      );
      const characterPhoto = page.locator('#character-image img').first();
      const characterBefore = await characterPhoto.getAttribute('src');
      await page
        .locator('#character-detail-shell')
        .getByRole('button', { name: 'Edit Photo' })
        .first()
        .evaluate((element: HTMLElement) => element.click());
      await expect(
        page.getByText('Character Personnel Record Photo: Edit'),
      ).toBeVisible();
      await uploadCrop(page, PICTURE);
      uploadedCharacter = true;
      await expect(characterPhoto).not.toHaveAttribute(
        'src',
        characterBefore ?? '',
      );

      await page
        .locator('#character-detail-shell')
        .getByRole('button', { name: 'Edit Photo' })
        .first()
        .evaluate((element: HTMLElement) => element.click());
      await page
        .getByLabel('Select a new profile picture')
        .setInputFiles(PICTURE);
      await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled({
        timeout: 30_000,
      });
      await press(page.getByRole('button', { name: 'Close' }));
      await expect(characterPhoto).not.toHaveAttribute(
        'src',
        characterBefore ?? '',
      );
    } finally {
      if (uploadedProfile) {
        backend.clearPersonnelPicture(member.email);
      }

      if (uploadedCharacter) {
        backend.clearCharacterPicture(
          member.email,
          account.handle,
          captain.handle,
        );
      }
    }
  },
);

async function openPhoto(page: Page, name: string): Promise<void> {
  await page
    .getByRole('button', { name })
    .evaluate((element: HTMLElement) => element.click());
  await expect(
    page.getByText('Starfleet Personnel Record Photo: Edit'),
  ).toBeVisible();
}

async function uploadCrop(page: Page, file: string): Promise<void> {
  const upload: Locator = page.getByRole('button', { name: 'Upload' });
  await page.getByLabel('Select a new profile picture').setInputFiles(file);
  await expect(upload).toBeEnabled({ timeout: 30_000 });
  await press(upload);
  await expect(
    page.getByText('Starfleet Personnel Record Photo: Edit'),
  ).toBeHidden();
  await expect(
    page.getByText('Character Personnel Record Photo: Edit'),
  ).toHaveCount(0);
}
