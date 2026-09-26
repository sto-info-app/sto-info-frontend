import { expect, Page } from '@playwright/test';

/**
 * Choose the first real option in a native select, once it has any.
 *
 * @param page - The page the select is on.
 * @param label - The select's accessible name.
 * @returns The visible text of the option that was chosen.
 */
export async function chooseFirst(page: Page, label: string): Promise<string> {
  const select = page.getByLabel(label, { exact: true });

  await expect
    .poll(async () => select.locator('option').count())
    .toBeGreaterThan(0);

  const text = (await select.locator('option').first().innerText()).trim();

  await select.selectOption({ index: 0 });

  return text;
}

/**
 * Pick a platform that has a launcher, then pick that launcher.
 *
 * The inventory asks for both. A platform with no launcher is skipped.
 *
 * @param page - The account form.
 * @returns The platform and launcher names that were chosen.
 */
export async function choosePlatformAndLauncher(page: Page): Promise<{
  platform: string;
  launcher: string;
}> {
  const platform = page.getByLabel('Platform', { exact: true });

  await expect
    .poll(async () => platform.locator('option').count())
    .toBeGreaterThan(1);

  const count = await platform.locator('option').count();

  for (let index = 1; index < count; index += 1) {
    const platformName = (
      await platform.locator('option').nth(index).innerText()
    ).trim();

    await platform.selectOption({ index });

    const launcher = page.getByLabel('Launcher (Optional)');

    if ((await launcher.count()) === 0) {
      continue;
    }

    try {
      await expect
        .poll(async () => launcher.locator('option').count(), {
          timeout: 3_000,
        })
        .toBeGreaterThan(1);
    } catch {
      continue;
    }

    const launcherName = (
      await launcher.locator('option').nth(1).innerText()
    ).trim();

    await launcher.selectOption({ index: 1 });

    return { platform: platformName, launcher: launcherName };
  }

  throw new Error('No platform offered a launcher.');
}

/**
 * Fill the captain metadata selects.
 *
 * Faction, allegiance, recruit type and species depend on each other, so a
 * faction that cannot complete the set is skipped.
 *
 * @param page - The captain form.
 * @returns The starting faction that was saved.
 */
export async function fillCharacterMetadata(page: Page): Promise<string> {
  const faction = page.getByLabel('Starting Faction', { exact: true });

  await expect
    .poll(async () => faction.locator('option').count())
    .toBeGreaterThan(0);

  const factionCount = await faction.locator('option').count();

  for (let index = 0; index < factionCount; index += 1) {
    const name = (
      await faction.locator('option').nth(index).innerText()
    ).trim();

    await faction.selectOption({ index });

    const recruit = page.getByLabel('Recruit Type', { exact: true });
    const allegiance = page.getByLabel('General Allegiance', { exact: true });
    const species = page.getByLabel('Species', { exact: true });

    try {
      await expect
        .poll(async () => recruit.locator('option').count(), { timeout: 8_000 })
        .toBeGreaterThan(0);
      await expect
        .poll(async () => allegiance.locator('option').count(), {
          timeout: 8_000,
        })
        .toBeGreaterThan(0);
      await recruit.selectOption({ index: 0 });
      await allegiance.selectOption({ index: 0 });
      await expect
        .poll(async () => species.locator('option').count(), { timeout: 8_000 })
        .toBeGreaterThan(0);
      await species.selectOption({ index: 0 });
      await chooseFirst(page, 'Sex');
      await chooseFirst(page, 'Career Path (Class)');

      return name;
    } catch {
      continue;
    }
  }

  throw new Error('No faction offered a complete set of character metadata.');
}
