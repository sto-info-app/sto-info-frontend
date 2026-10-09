import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';

/**
 * REVIEW-01, REVIEW-02 and REVIEW-03.
 *
 * axe is scoped to the page content. The shared frame is not this review.
 * A failed save must leave what was typed, and a second click while the
 * first save is in flight must not send a second write.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

const PHONE = { width: 375, height: 812 };

test(
  'REVIEW-01 axe and a keyboard path through a form and a dialog',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    backend.storytimeOn();

    const targets = [
      '/login',
      '/dashboard/accounts/add',
      '/dashboard/settings',
      '/community/registry/profiles',
    ];

    for (const path of targets) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      await noViolations(page);
    }

    await page.goto('/login');
    await page.getByLabel('Email').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();

    await page.goto('/dashboard/settings');
    const privacy = page.getByRole('switch', { name: 'Privacy Mode' });
    await privacy.focus();
    const wasOn = await privacy.isChecked();
    await page.keyboard.press('Space');
    if (wasOn) {
      await expect(privacy).not.toBeChecked();
    } else {
      await expect(privacy).toBeChecked();
    }
    await page.keyboard.press('Space');
  },
);

test(
  'REVIEW-02 a phone-width account form does not scroll sideways',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('/dashboard/accounts/add');
    await expect(
      page.getByRole('heading', { name: 'Add STO Account' }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  },
);

test(
  'REVIEW-03 a failed save keeps the notes, and a double click writes once',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await page.goto('/dashboard/accounts/demo-014-01/edit');
    await expect(page).toHaveURL(/\/edit$/);

    const notes = page.getByLabel('Notes');
    const original = await notes.inputValue();
    const edited = `${original} retry`;

    await page.route('http://localhost:3004/**', async route => {
      const request = route.request();
      if (request.method() === 'PUT' || request.method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          body: '{"message":"weekly fault"}',
        });
        return;
      }
      await route.continue();
    });

    await notes.fill(edited);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(notes).toHaveValue(edited);
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    let writes = 0;
    await page.route('http://localhost:3004/**', async route => {
      const request = route.request();
      if (request.method() === 'PUT' || request.method() === 'PATCH') {
        writes += 1;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      await route.continue();
    });

    await notes.fill(`${original} once`);
    const save = page.getByRole('button', { name: 'Save', exact: true });
    await save.click();
    await save.click({ timeout: 1_000 }).catch(() => undefined);
    await expect(page).not.toHaveURL(/\/edit$/);
    expect(writes).toBe(1);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.goto('/dashboard/accounts/demo-014-01/edit');
    await page.getByLabel('Notes').fill(original);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).not.toHaveURL(/\/edit$/);
  },
);

async function noViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    violations.map(violation => `${violation.id}: ${violation.help}`),
  ).toEqual([]);
}
