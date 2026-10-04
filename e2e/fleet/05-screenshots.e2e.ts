import { mkdirSync } from 'node:fs';

import { expect, Page } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * Representative screenshots for FC-044's evidence, at 1280px on the desktop
 * project and 375px-wide on the phone project, written to
 * `docs/screenshots/fc-044/`.
 *
 * Everything on them was made for the run by people made for the run, so they
 * show no real member, roster, handle or chat. Each run overwrites the last.
 */

const FOLDER = 'docs/screenshots/fc-044';

/** The basic roster fixture's rows, with the run's own names. */
const rosterRows = (): string[] => [
  'Character Name,Account Handle,Level,Class,Guild Rank,Contribution Total,Join Date,Rank Change Date,Last Active Date,Status,Public Comment,Public Comment Last Edit Date',
  'Aria Venn,@fixture001,65,Starfleet Tactical Officer,Member,120500,3/4/2023 8:15:00pm,6/1/2023 9:00:00am,1/1/2024 11:45:00am,"Offline","Happy to run TFOs at weekends",5/2/2023 7:30:00pm',
  'Dax Orlan,@fixture002,50,Starfleet Engineering Officer,Recruit,0,12/20/2023 2:05:00am,,12/31/2023 10:00:00pm,"Offline","",',
];

/**
 * Saves the page as it is, whole, under the project's name.
 *
 * @param page - The page.
 * @param device - `desktop` or `phone`.
 * @param name - What it shows.
 */
async function capture(
  page: Page,
  device: string,
  name: string,
): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: `${FOLDER}/${device}-${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('representative Fleet Community pages', async ({ as }, info) => {
  test.setTimeout(600_000);
  mkdirSync(FOLDER, { recursive: true });

  const device = info.project.name.includes('mobile') ? 'phone' : 'desktop';
  const owner = await as('owner');
  const communityName = named(info, 'Screens Community');
  const fleetName = named(info, 'Screens Fleet');

  await owner.goto('/fleets/register');
  await capture(owner, device, '01-register-community');
  await owner.getByLabel('Name', { exact: true }).fill(communityName);
  await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
  await owner.getByRole('button', { name: 'Register' }).click();
  await expect(owner).toHaveURL(/\/fleets\/communities\/[^/]+$/);

  const communityPath = new URL(owner.url()).pathname;

  await owner
    .getByRole('link', { name: `Register a Fleet into ${communityName}` })
    .click();
  await owner.getByLabel('Name, exactly as in game').fill(fleetName);
  await owner.getByLabel('Platform').selectOption({ label: 'Windows' });
  await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
  await owner
    .getByRole('button', { name: 'Check for existing records' })
    .click();
  await owner.getByRole('button', { name: 'Register' }).click();
  await expect(owner).toHaveURL(/\/fleets\/windows\/[^/]+$/);

  const fleetPath = new URL(owner.url()).pathname;

  await owner.goto(`${fleetPath}/import`);
  await owner.getByLabel('The export, as the game wrote it').setInputFiles({
    name: `${fleetName}_20240101-120000.Csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(`${rosterRows().join('\r\n')}\r\n`, 'utf8'),
  });
  await owner.getByLabel('The clock it was taken on').selectOption('UTC');
  await owner.getByRole('button', { name: 'Check this export' }).click();
  await expect(owner.getByText('Ready to import')).toBeVisible();
  await capture(owner, device, '02-import-check');
  await owner.getByRole('button', { name: 'Import this export' }).click();
  await expect(owner.getByText('Imported', { exact: true })).toBeVisible({
    timeout: 120_000,
  });

  for (const [path, name] of [
    [communityPath, '03-community'],
    [fleetPath, '04-fleet'],
    [`${fleetPath}/roster`, '05-roster'],
    [`${fleetPath}/history`, '06-history'],
    [`${fleetPath}/events`, '07-events'],
    [`${fleetPath}/events/new`, '08-new-event'],
    [`${fleetPath}/recruitment/settings`, '09-recruitment-settings'],
    [`${fleetPath}/manage`, '10-manage'],
    ['/chat', '11-chat'],
    ['/dashboard/fleets', '12-dashboard-fleets'],
    ['/dashboard/settings', '13-settings'],
    ['/help/topics/fleets', '14-help-fleets'],
  ] as const) {
    await owner.goto(path);
    await capture(owner, device, name);
  }

  const admin = await as('admin');

  for (const [path, name] of [
    ['/admin/chat-reports', '15-admin-chat-reports'],
    ['/admin/scan-diagnostics', '16-admin-scan-diagnostics'],
  ] as const) {
    await admin.goto(path);
    await capture(admin, device, name);
  }

  // Nothing of a real person: only the run's own people and records.
  expect(fleetPeople().people.owner.email).toMatch(/@fc044\.example$/);
});
