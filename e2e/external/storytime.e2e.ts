import { resolve } from 'node:path';

import { expect, Locator, Page, test } from '@playwright/test';

import { backend } from '../support/backend';
import { member } from '../support/member';
import { press } from './account';

/**
 * STORY-12.
 *
 * Artwork uses the Storytime image manager and is removed before the case
 * finishes. A markdown preview has to render the fixture heading and must not
 * render a script. A YouTube embed stays a still image until Play is pressed.
 * Skipped unless E2E_IMAGES=on, because the artwork leaves this machine.
 */

const PICTURE = resolve('e2e/fixtures/picture.png');
const VIDEO = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

test.skip(
  process.env['E2E_IMAGES'] !== 'on',
  'Uploads reach Cloudflare Images and the virus scanner. Set E2E_IMAGES=on to run it.',
);

test(
  'STORY-12 story artwork, a safe preview, and a video that waits for play',
  { tag: '@external' },
  async ({ page }) => {
    test.setTimeout(600_000);

    const stamp = Date.now().toString(36);
    const title = `E2E Weekly external ${stamp}`;
    const storySlug = `e2eext${stamp}`;
    const chapterSlug = `opening${stamp}`;
    let switchedOn = false;

    try {
      switchedOn = await ensureStorytime(page);
      const id = await createStory(page, title, storySlug);

      await page
        .getByLabel('Description', { exact: true })
        .fill(
          ['## Fixture heading', '', '<script>alert(1)</script>'].join('\n'),
        );
      await page.getByRole('tab', { name: 'Preview' }).click();
      const preview = page.locator('.storytime-markdown-field__preview');
      await expect(
        preview.getByRole('heading', { name: 'Fixture heading' }),
      ).toBeVisible();
      await expect(preview.locator('script')).toHaveCount(0);

      const profile = page
        .locator('.storytime-image-manager')
        .filter({ hasText: 'Story profile image' });
      await press(profile.getByRole('button', { name: 'Add' }));
      await press(page.getByRole('button', { name: 'Cancel' }));
      await expect(profile.getByRole('button', { name: 'Add' })).toBeVisible();

      await press(profile.getByRole('button', { name: 'Add' }));
      await page
        .getByLabel('Choose a picture for the Story profile image')
        .setInputFiles(PICTURE);
      await page
        .getByLabel('What does this picture show?')
        .fill('A fixture portrait');
      await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled({
        timeout: 30_000,
      });
      await press(page.getByRole('button', { name: 'Upload' }));
      await expect(profile.getByAltText('A fixture portrait')).toBeVisible();
      await removeProfileImage(page, profile);

      await publish(page);
      await page.goto(`/storytime/manage/stories/${id}/chapters/new`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        page.getByRole('heading', { name: 'Write a Chapter' }),
      ).toBeVisible();
      await page.getByLabel('Title', { exact: true }).fill('Opening');
      await page.getByLabel('URL slug').fill(chapterSlug);
      await page
        .getByRole('textbox', { name: 'Chapter' })
        .fill('The external chapter.');
      await press(page.getByRole('button', { name: 'Save', exact: true }));
      await expect(
        page.getByRole('heading', { name: 'Edit Chapter' }),
      ).toBeVisible();

      await page.getByLabel('Paste a YouTube link').fill(VIDEO);
      await press(page.getByRole('button', { name: 'Add video' }));
      await expect(page.locator('.storytime-editor__media-list')).toBeVisible();
      await expect(page.locator('iframe')).toHaveCount(0);

      await publish(page);
      await page.goto(
        `/storytime/stories/${storySlug}/chapters/${chapterSlug}`,
        {
          waitUntil: 'domcontentloaded',
        },
      );
      await expect(page.locator('iframe')).toHaveCount(0);
      await press(page.getByRole('button', { name: /^Play / }));
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(page.locator('iframe')).toHaveAttribute(
        'src',
        /youtube-nocookie/,
      );
    } finally {
      const profile = page
        .locator('.storytime-image-manager')
        .filter({ hasText: 'Story profile image' });
      const remove = profile.getByRole('button', { name: 'Remove' });

      if (await remove.isVisible().catch(() => false)) {
        await removeProfileImage(page, profile);
      }

      backend.discardWeekly(member.email);

      if (switchedOn) {
        backend.storytimeOff();
      }
    }
  },
);

async function ensureStorytime(page: Page): Promise<boolean> {
  await page.goto('/storytime', { waitUntil: 'domcontentloaded' });

  const unavailable = page.url().includes('/unavailable');

  if (unavailable) {
    backend.storytimeOn();
  }

  await expect(async () => {
    await page.goto('/storytime', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/unavailable/);
  }).toPass({ timeout: 45_000 });

  return unavailable;
}

async function createStory(
  page: Page,
  title: string,
  slug: string,
): Promise<string> {
  await page.goto('/storytime/manage/stories/new', {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', { name: 'Create a Story' }),
  ).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Short description').fill('An external story.');
  await page.getByLabel('URL slug').fill(slug);
  await press(page.getByRole('button', { name: 'Save', exact: true }));
  await expect(page).toHaveURL(/\/manage\/stories\/[0-9a-f-]{36}(?:\/|$)/i);
  const match = /\/manage\/stories\/([0-9a-f-]{36})/i.exec(page.url());

  if (!match?.[1]) {
    throw new Error('Saving the story did not open it.');
  }

  return match[1];
}

async function publish(page: Page): Promise<void> {
  await press(page.getByRole('button', { name: 'Save and publish' }));
  const confirm = page.getByRole('button', { name: 'I confirm' });

  if (await confirm.isVisible()) {
    await press(confirm);
    await press(page.getByRole('button', { name: 'Save and publish' }));
  }
}

async function removeProfileImage(page: Page, profile: Locator): Promise<void> {
  await press(profile.getByRole('button', { name: 'Remove' }));
  const confirmation = page
    .getByRole('dialog')
    .filter({ hasText: 'Remove the story profile image' });
  await press(
    confirmation.getByRole('button', { name: 'Remove', exact: true }),
  );
  await expect(profile.getByRole('button', { name: 'Add' })).toBeVisible();
}
