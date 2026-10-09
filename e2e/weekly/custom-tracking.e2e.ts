import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { CustomTrackingPage } from '../support/custom-tracking.page';
import { member } from '../support/member';

/**
 * CT-15 and CT-16.
 *
 * Actors: the demonstration member. Picture fields stay out of this run.
 * The feature is switched back on if a case switched it off, and anything
 * this file built is removed.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'CT-15 leaving an unsaved account edit asks, and the feature off is unavailable',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    test.setTimeout(360_000);
    backend.begin(member.email);
    const tracking = new CustomTrackingPage(page);
    await tracking.openReady();
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection('Weekly leave');
    await tracking.addTab('Weekly leave', 'Notes');
    await tracking.addField('Notes', 'A note', { type: 'TEXT_SINGLE_LINE' });

    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    const [account] = await tracking.targetLabels();
    await tracking.chooseTarget(account);
    const note = tracking.values.getByLabel('A note', { exact: true });
    await note.fill('unsaved weekly note');
    await note.press('Tab');

    // The guard cancels the navigation, so the click must not wait for one.
    await page
      .locator('#lcars-side-bar')
      .getByRole('link', { name: 'Dashboard' })
      .click({ noWaitAfter: true });
    await expect(
      page.getByText('You have changes here that have not been saved.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stay here' }).click();
    await expect(page).toHaveURL(/custom-tracking/);
    await expect(note).toHaveValue('unsaved weekly note');
    await page
      .locator('#lcars-side-bar')
      .getByRole('link', { name: 'Dashboard' })
      .click({ noWaitAfter: true });
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    backend.setFeature('off');

    try {
      await expect(async () => {
        await page.goto('/dashboard/settings/custom-tracking', {
          waitUntil: 'domcontentloaded',
        });
        await expect(page.getByText('Currently Offline')).toBeVisible();
      }).toPass({ timeout: 25_000 });
    } finally {
      backend.setFeature('on');
      await tracking.tidyUp();
    }
  },
);

test(
  'CT-16 markdown, a decimal, and a toggle round-trip',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    backend.begin(member.email);
    const tracking = new CustomTrackingPage(page);

    try {
      await tracking.openReady();
      await tracking.chooseScope(tracking.definitions, 'Accounts');
      await tracking.addSection('Weekly types');
      await tracking.addTab('Weekly types', 'Remaining');
      await tracking.addField('Remaining', 'A paragraph', { type: 'MARKDOWN' });
      await tracking.addField('Remaining', 'A decimal', { type: 'DECIMAL' });
      await tracking.addField('Remaining', 'A switch', { type: 'TOGGLE' });

      await tracking.show('What you have recorded');
      await tracking.chooseScope(tracking.values, 'Accounts');
      const [account] = await tracking.targetLabels();
      await tracking.chooseTarget(account);

      await tracking.values
        .getByLabel('A paragraph', { exact: true })
        .fill('Kept as written.');
      await tracking.values
        .getByLabel('A decimal', { exact: true })
        .fill('1.5');
      await tracking.values.getByRole('switch', { name: 'A switch' }).click();
      await tracking.saveRecord();
      await expect(tracking.savedConfirmation).toBeVisible();

      await tracking.openReady();
      await tracking.show('What you have recorded');
      await tracking.chooseScope(tracking.values, 'Accounts');
      await tracking.chooseTarget(account);
      await expect(
        tracking.values.getByLabel('A paragraph', { exact: true }),
      ).toHaveValue('Kept as written.');
      await expect(
        tracking.values.getByLabel('A decimal', { exact: true }),
      ).toHaveValue('1.5');
      await expect(
        tracking.values.getByRole('switch', { name: 'A switch' }),
      ).toHaveAttribute('aria-checked', 'true');
    } finally {
      await tracking.tidyUp();
    }
  },
);
