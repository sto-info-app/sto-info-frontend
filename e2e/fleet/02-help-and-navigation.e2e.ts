import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { expect, Page } from '@playwright/test';

import helpManifest from '../../src/app/static-pages/help/help-guide-slugs.json';
import {
  fleetBackend,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * Plan section 5's Help and navigation journeys (FC-044): Help home to each
 * visible section, to a guide, to the feature; Settings and its guide to each
 * other; Community and the Dashboard to Fleets; and the same with no
 * membership, several, signed out, with Fleet Community switched off and with
 * the site's systems not answering.
 */

/**
 * Whether a page ended on the not-found page.
 *
 * @param page - The page.
 * @returns True when it did.
 */
const notFound = (page: Page): boolean => page.url().includes('page-not-found');

/**
 * Registers a Community as the page's person.
 *
 * @param page - The page.
 * @param name - Its name.
 * @returns Its path.
 */
async function registerCommunity(page: Page, name: string): Promise<string> {
  await page.goto('/fleets/register');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);

  return new URL(page.url()).pathname;
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Help home leads to each visible section, and each section to its guides', async ({
  as,
}) => {
  const page = await as('owner');

  await page.goto('/help');

  const tiles = page.locator('.help-tile-grid > li');

  // Every public section, and nothing empty.
  await expect(tiles).toHaveCount(helpManifest.topics.length);

  for (const topic of helpManifest.topics) {
    await page.goto(`/help/topics/${topic}`);
    await expect(page.locator('#help-topic-page h1')).toBeVisible();
    expect(
      await page.locator('.help-guide-list > li').count(),
      topic,
    ).toBeGreaterThan(0);
  }
});

test('every Fleet guide opens, and every page it links to is there', async ({
  as,
}) => {
  const page = await as('owner');

  await page.goto('/help/topics/fleets');

  const guideLinks = page.locator('.help-guide-list > li a');

  // evaluateAll does not wait for the topic to draw its list.
  await expect(guideLinks.first()).toBeVisible();

  const guides = await guideLinks.evaluateAll(links =>
    links.map(link => link.getAttribute('href')!),
  );
  const destinations = new Set<string>();

  expect(guides.length).toBeGreaterThan(10);

  for (const guide of guides) {
    await page.goto(guide);
    await expect(page.locator('#help-guide-page h1')).toBeVisible();

    for (const href of await page
      .locator('#help-guide-page a[href^="/"]')
      .evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
      if (!href.startsWith('/help')) {
        destinations.add(href);
      }
    }
  }

  for (const destination of destinations) {
    await page.goto(destination);
    await page.waitForLoadState('networkidle');
    expect(notFound(page), destination).toBe(false);
  }
});

test('Settings and its Fleet guide lead to each other', async ({ as }) => {
  const page = await as('owner');

  await page.goto('/dashboard/settings');
  await page.getByRole('link', { name: 'Help with Fleet settings' }).click();
  await expect(page).toHaveURL('/help/fleet-settings');
  await page
    .locator('#help-guide-page')
    .locator('a[href="/dashboard/settings"]')
    .first()
    .click();
  await expect(page).toHaveURL('/dashboard/settings');
});

test('Community and the Dashboard lead to Fleets', async ({ as }) => {
  const page = await as('owner');

  await page.goto('/community');
  await page
    .getByRole('navigation', { name: 'Community sections' })
    .getByRole('link', { name: 'Fleets', exact: true })
    .click();
  await expect(page).toHaveURL('/fleets');
  await expect(
    page.getByRole('heading', { name: 'Fleet Directory' }),
  ).toBeVisible();

  await page.goto('/dashboard');
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Fleets/ })
    .first()
    .click();
  await expect(page).toHaveURL('/dashboard/fleets');
});

test('somebody who follows nothing is offered the directories', async ({
  as,
}) => {
  const page = await as('stranger');

  await page.goto('/dashboard/fleets');
  await expect(page.getByText('Nothing followed yet')).toBeVisible();

  const directories = page.getByRole('navigation', {
    name: 'Fleet directories',
  });

  for (const name of [
    'Browse Fleets',
    'Browse Communities',
    'Browse Armadas',
    'Register a Community',
  ]) {
    await expect(directories.getByRole('link', { name })).toBeVisible();
  }
});

test('somebody who follows several Communities sees each, and is sent to none', async ({
  as,
}, info) => {
  const owner = await as('owner');
  const friend = await as('friend');
  const names = [named(info, 'Nav One'), named(info, 'Nav Two')];
  const paths: string[] = [];

  for (const name of names) {
    paths.push(await registerCommunity(owner, name));
  }

  for (const path of paths) {
    await friend.goto(path);
    await friend.getByRole('button', { name: 'Follow this Community' }).click();
    await expect(
      friend.getByRole('button', { name: 'Stop following' }),
    ).toBeVisible();
  }

  await friend.goto('/dashboard/fleets');
  await expect(friend).toHaveURL('/dashboard/fleets');

  for (const name of names) {
    await expect(friend.getByRole('link', { name })).toBeVisible();
  }
});

test('signed out, the directories are open and the Dashboard asks for a sign-in', async ({
  anonymous,
}) => {
  const page = await anonymous();

  await page.goto('/fleets');
  await expect(
    page.getByRole('heading', { name: 'Fleet Directory' }),
  ).toBeVisible();

  await page.goto('/dashboard/fleets');
  await expect(page).toHaveURL(/\/login/);
});

test('with Fleet Community switched off, its pages say so and its help stays', async ({
  as,
}) => {
  const page = await as('owner');

  fleetBackend.setFeature('off');

  try {
    // The server reads the switch within ten seconds.
    await expect(async () => {
      await page.goto('/fleets');
      await expect(page.getByText('Currently Offline')).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 30_000 });

    await page.goto('/help/topics/fleets');
    await expect(page.locator('.help-switched-off')).toBeVisible();
    await expect(page.locator('.help-guide-list > li').first()).toBeVisible();

    await page.goto('/dashboard');
    await expect(
      page.getByRole('main').getByRole('link', { name: /^Fleets/ }),
    ).toHaveCount(0);
  } finally {
    fleetBackend.setFeature('on');
  }

  await expect(async () => {
    await page.goto('/fleets');
    await expect(
      page.getByRole('heading', { name: 'Fleet Directory' }),
    ).toBeVisible({ timeout: 2_000 });
    await expect(page.getByText('Currently Offline')).toHaveCount(0);
  }).toPass({ timeout: 30_000 });
});

test('with the site’s systems not answering, Fleet pages say so and Help still reads', async ({
  anonymous,
}) => {
  const page = await anonymous();

  await page.route('**/fleet/configuration', route => route.abort());

  await page.goto('/fleets');
  await expect(page.getByText('Connection Lost')).toBeVisible();

  await page.goto('/help/topics/fleets');
  await expect(page.locator('.help-guide-list > li').first()).toBeVisible();

  await page.goto('/help/fleet-chat');
  await expect(
    page.locator('#help-guide-page h1', { hasText: 'Fleet chat' }),
  ).toBeVisible();
});

// AC1's sitemap: made as the build makes it, then every Help address in it
// opened by somebody signed out. Running the site's guides answer anybody
// but an admin with the not-found page, so one listed would fail here.
test('the sitemap lists every public guide and section, and each opens signed out', async ({
  anonymous,
}, info) => {
  test.skip(info.project.name !== 'fleet-desktop', 'Once is enough');

  execFileSync(process.execPath, ['scripts/generate-content.mjs'], {
    stdio: 'ignore',
  });

  const paths = [
    ...readFileSync('generated/sitemap.xml', 'utf8').matchAll(
      /<loc>([^<]+)<\/loc>/g,
    ),
  ].map(([, loc]) => new URL(loc).pathname);

  for (const slug of helpManifest.slugs) {
    expect(paths).toContain(`/help/${slug}`);
  }

  for (const topic of helpManifest.topics) {
    expect(paths).toContain(`/help/topics/${topic}`);
  }

  expect(
    paths.filter(path => /^\/(admin|dashboard|chat)\b/.test(path)),
  ).toEqual([]);
  expect(paths).not.toContain('/help/topics/site-admin');

  const page = await anonymous();

  for (const path of paths.filter(each => each.startsWith('/help/'))) {
    await page.goto(path);
    await expect(page.locator('h1').first(), path).toBeVisible();
    expect(notFound(page), path).toBe(false);
  }
});
