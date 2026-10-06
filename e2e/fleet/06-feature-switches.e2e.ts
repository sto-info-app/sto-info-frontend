import { expect, Locator, Page } from '@playwright/test';

import { noViolations } from '../support/axe';
import { backendSupport } from '../support/backend';
import {
  fleetBackend,
  FLEET_PEOPLE_FILE,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The feature switches on the Admin page (FC-045), and the release smoke
 * test Steve asked for on 6 October 2026: Fleet Communities switched off
 * from the page takes every Fleet page away for everybody, and switched on
 * again brings it back, each change with a reason the Security Log keeps.
 * The contact form offers its Fleet Communities topic only while Fleet is
 * on, and Storytime is switched from the same panel.
 *
 * Every change is put back as the run found it, from the support script when
 * a step fails part way, so the journeys after this one are not left with a
 * feature off.
 */

/**
 * The Features panel on the Admin page.
 *
 * @param page - The page.
 * @returns It.
 */
const panel = (page: Page): Locator =>
  page.getByRole('region', { name: 'Features' });

/**
 * One feature in the panel.
 *
 * @param page - The page.
 * @param label - Its name.
 * @returns It.
 */
const feature = (page: Page, label: string): Locator =>
  panel(page).getByRole('listitem', { name: label, exact: true });

/**
 * Switches a feature from the panel, giving a reason, and waits for the
 * panel to say it is done.
 *
 * @param page - The site admin's page, on the Admin page.
 * @param label - The feature's name.
 * @param to - Which way.
 * @param reason - Why.
 */
async function flip(
  page: Page,
  label: string,
  to: 'on' | 'off',
  reason: string,
): Promise<void> {
  await panel(page)
    .getByRole('button', { name: `Switch ${label} ${to}`, exact: true })
    .click();

  const dialog = page.getByRole('dialog');

  await expect(dialog).toContainText(`Switch ${label} ${to}`);
  await dialog.getByLabel('Reason').fill(reason);
  await dialog
    .getByRole('button', { name: `Switch ${to}`, exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(panel(page).getByRole('status')).toContainText(
    `${label} switched ${to}.`,
  );
  await expect(
    feature(page, label).locator('.feature-switches__state'),
  ).toHaveText(to === 'on' ? 'On' : 'Off');
}

/**
 * Whether the contact form offers the Fleet Communities topic.
 *
 * @param page - A page.
 * @returns The topic's option.
 */
async function fleetTopic(page: Page): Promise<Locator> {
  await page.goto('/contact');
  await expect(
    page.getByLabel('Topic').locator('option', { hasText: 'Feedback' }),
  ).toHaveCount(1);

  return page
    .getByLabel('Topic')
    .locator('option', { hasText: 'Fleet Communities' });
}

test.describe.serial('Feature switches on the Admin page (FC-045)', () => {
  let tag: string;

  /** A reason, recognisably this run's. */
  const why = (what: string): string => `${tag}: ${what}`;

  test('a site admin sees each feature, whether it is on, and what the environment allows', async ({
    as,
  }, info) => {
    tag = named(info, 'switches');

    const page = await as('admin');

    await page.goto('/admin');
    await expect(panel(page)).toBeVisible();
    await expect(
      panel(page).getByRole('link', { name: 'Help with switching features' }),
    ).toHaveAttribute('href', '/help/site-admin-features');

    for (const label of ['Fleet Communities', 'Storytime', 'Custom Tracking']) {
      await expect(feature(page, label)).toBeVisible();
      await expect(
        feature(page, label).locator('.feature-switches__state'),
      ).toHaveText(/^(On|Off)$/);
    }

    // The run's setup switched Fleet on.
    const fleet = feature(page, 'Fleet Communities');

    await expect(fleet.locator('.feature-switches__state')).toHaveText('On');
    await expect(fleet).toContainText('Set by the environment');
    await expect(fleet).toContainText(
      'Registering Communities, Fleets and Armadas: allowed',
    );
    await expect(fleet.locator('input, select, textarea')).toHaveCount(0);

    await noViolations(page, 'the Admin page with its feature switches');
  });

  test('Fleet Communities switched off takes it away for everybody, and on again brings it back', async ({
    as,
    anonymous,
  }) => {
    test.setTimeout(180_000);

    const admin = await as('admin');
    const owner = await as('owner');
    const stranger = await anonymous();

    await expect(await fleetTopic(stranger)).toHaveCount(1);
    await admin.goto('/admin');

    try {
      await flip(admin, 'Fleet Communities', 'off', why('switch Fleet off'));

      // The server reads the switch within ten seconds.
      await expect(async () => {
        await owner.goto('/fleets');
        await expect(owner.getByText('Currently Offline')).toBeVisible({
          timeout: 2_000,
        });
      }).toPass({ timeout: 30_000 });
      await expect(await fleetTopic(stranger)).toHaveCount(0);

      // Off says who and when, and the switch says it can go back on.
      await admin.reload();
      await expect(
        feature(admin, 'Fleet Communities').locator('dd').nth(1),
      ).not.toHaveText('Not recorded');
      await expect(
        panel(admin).getByRole('button', {
          name: 'Switch Fleet Communities on',
          exact: true,
        }),
      ).toBeVisible();

      await flip(admin, 'Fleet Communities', 'on', why('switch Fleet on'));
    } finally {
      // Whatever happened above, the journeys after this need Fleet on.
      fleetBackend.setFeature('on');
    }

    await expect(async () => {
      await owner.goto('/fleets');
      await expect(
        owner.getByRole('heading', { name: 'Fleet Directory' }),
      ).toBeVisible({ timeout: 2_000 });
      await expect(owner.getByText('Currently Offline')).toHaveCount(0);
    }).toPass({ timeout: 30_000 });
    await expect(await fleetTopic(stranger)).toHaveCount(1);
  });

  test('Storytime is switched from the same panel, and put back as it was', async ({
    as,
  }) => {
    const admin = await as('admin');

    await admin.goto('/admin');

    const state = feature(admin, 'Storytime').locator(
      '.feature-switches__state',
    );

    await expect(state).toHaveText(/^(On|Off)$/);

    const was = (await state.textContent())?.trim() === 'On' ? 'on' : 'off';
    const other = was === 'on' ? 'off' : 'on';

    try {
      await flip(admin, 'Storytime', other, why(`switch Storytime ${other}`));
      await flip(admin, 'Storytime', was, why(`switch Storytime ${was}`));
    } finally {
      backendSupport('fleet-storytime', 'restore', FLEET_PEOPLE_FILE);
    }
  });

  test('a switch already thrown elsewhere says so, and shows it as it is', async ({
    as,
  }) => {
    const admin = await as('admin');

    await admin.goto('/admin');
    await expect(
      feature(admin, 'Fleet Communities').locator('.feature-switches__state'),
    ).toHaveText('On');

    // Another administrator switches it off while this page still says on.
    fleetBackend.setFeature('off');

    try {
      await panel(admin)
        .getByRole('button', {
          name: 'Switch Fleet Communities off',
          exact: true,
        })
        .click();

      const dialog = admin.getByRole('dialog');

      await dialog.getByLabel('Reason').fill(why('switch Fleet off twice'));
      await dialog
        .getByRole('button', { name: 'Switch off', exact: true })
        .click();
      await expect(panel(admin).getByRole('alert')).toContainText(
        'Fleet Communities is already switched off.',
      );
      await expect(
        feature(admin, 'Fleet Communities').locator('.feature-switches__state'),
      ).toHaveText('Off');
    } finally {
      fleetBackend.setFeature('on');
    }
  });

  test('the Security Log names each change, the feature and its reason', async ({
    as,
  }) => {
    const page = await as('admin');

    await page.goto('/admin/security-log');
    await page
      .getByLabel('Show', { exact: true })
      .selectOption({ label: 'Site admin actions' });

    for (const [reason, action, subject] of [
      [why('switch Fleet off'), 'Switched a feature off', 'Fleet Communities'],
      [why('switch Fleet on'), 'Switched a feature on', 'Fleet Communities'],
      [why('switch Storytime on'), 'Switched a feature on', 'Storytime'],
      [why('switch Storytime off'), 'Switched a feature off', 'Storytime'],
    ]) {
      const row = page.getByRole('row').filter({ hasText: reason });

      await expect(row, reason).toBeVisible();
      await expect(row).toContainText(action);
      await expect(row).toContainText(subject);
    }

    // The refused change was never made, so it was never logged.
    await expect(
      page.getByRole('row').filter({ hasText: why('switch Fleet off twice') }),
    ).toHaveCount(0);
  });
});
