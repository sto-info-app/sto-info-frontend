import { expect, Locator, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug } from '../support/snapshot';

/**
 * ACC-02 and CHAR-02.
 *
 * Actors: the demonstration member. Nothing created here is saved. Cancel
 * leaves the existing account and captain as they were.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'ACC-02 validation, a launcher limited by platform, and cancel',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const before = backend.snapshot(member.email);
    const account = accountBySlug(before, member.publicAccount);

    await page.goto('/dashboard/accounts/add');
    await expect(
      page.getByRole('heading', { name: 'Add STO Account' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create', exact: true }),
    ).toBeDisabled();

    await page.getByLabel('Platform', { exact: true }).selectOption({
      label: 'PlayStation',
    });
    const playstation = await launcherNames(page);
    expect(playstation.some(name => /steam|epic|arc/i.test(name))).toBe(false);
    expect(playstation.length).toBeGreaterThan(0);

    await page.getByLabel('Platform', { exact: true }).selectOption({
      label: 'Windows',
    });
    const windows = await launcherNames(page);
    expect(windows.some(name => /steam/i.test(name))).toBe(true);

    await page.goto(`/dashboard/accounts/${account.handle}/edit`);
    const notes = page.getByLabel('Notes');
    const original = await notes.inputValue();
    await notes.fill(`${original} weekly cancel`);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/accounts/${account.handle}$`),
    );

    const after = backend.snapshot(member.email);
    expect(accountBySlug(after, member.publicAccount).notes).toBe(
      account.notes,
    );
  },
);

test(
  'CHAR-02 a rejected name, a faction that changes the species, and cancel',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);
    const account = accountBySlug(shot, member.publicAccount);
    const captain = account.characters[0];

    if (!captain) {
      throw new Error('The public demonstration account has no captain.');
    }

    await page.goto(`/dashboard/accounts/${account.handle}/characters/add`);
    await expect(
      page.getByRole('heading', { name: 'Add Captain' }),
    ).toBeVisible();
    await page.getByLabel('Captain Name').fill('Avery1');
    await page.getByLabel('Captain Name').blur();
    await expect(
      page.getByRole('button', { name: 'Create', exact: true }),
    ).toBeDisabled();

    const faction = page.getByLabel('Starting Faction');
    const species = page.getByLabel('Species');
    await expect
      .poll(async () => faction.locator('option').count())
      .toBeGreaterThan(2);
    await faction.selectOption({ index: 1 });
    const firstSpecies = await speciesNames(species);
    await faction.selectOption({ index: 2 });
    await expect
      .poll(async () =>
        (await species.locator('option').allTextContents()).join('|'),
      )
      .not.toBe(firstSpecies);

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.goto(
      `/dashboard/accounts/${account.handle}/${captain.handle}/edit`,
    );
    await expect(
      page.getByRole('heading', { name: 'Edit Captain' }),
    ).toBeVisible();
    await page.getByLabel('Captain Name').fill('Avery1');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/accounts/${account.handle}/${captain.handle}$`),
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      captain.handle,
    );
  },
);

/**
 * Species offered for the faction just chosen.
 *
 * The list is replaced after the faction changes, and reading it in the same
 * turn still sees the previous faction's options — or none at all.
 */
async function speciesNames(species: Locator): Promise<string> {
  let names = '';

  await expect
    .poll(async () => {
      names = (await species.locator('option').allTextContents()).join('|');

      return names;
    })
    .not.toBe('');

  return names;
}

async function launcherNames(page: Page): Promise<string[]> {
  const launcher = page.getByLabel('Launcher (Optional)');

  await expect
    .poll(async () => launcher.locator('option').count())
    .toBeGreaterThan(0);

  return (await launcher.locator('option').allTextContents()).map(name =>
    name.trim(),
  );
}
