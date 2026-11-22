import { resolve } from 'node:path';

import { expect, Page } from '@playwright/test';

import { FleetPerson } from '../../support/fleet-people';

/**
 * What a clip needs in place before it records (13 October 2026): records
 * the Owner registers off camera, at a test's pace rather than a viewer's,
 * through the same pages a person would use. Each returns the path of what
 * it made, for the clip to open.
 */

/** A square picture, big enough for an emblem or a cover. */
export const PICTURE = resolve('e2e/fixtures/picture.png');

/** A wide picture, big enough for a banner. */
export const BANNER = resolve('e2e/fixtures/banner.png');

/**
 * How the recruitment forms offer somebody's Character.
 *
 * @param person - Whose.
 * @returns The option, as it reads.
 */
export const characterLabelOf = (person: FleetPerson): string =>
  `${person.characterName}@${person.accountHandle}`;

/** What the registration forms ask about a Fleet, as they word it. */
export interface FleetChoices {
  /** Which platform; Windows unless said. */
  readonly platform?: string;
  /** Federation or Klingon; Federation unless said, or null to leave unset. */
  readonly allegiance?: string | null;
  /** How people join, as the form words it; the Community's own unless said. */
  readonly recruitment?: string;
}

/**
 * Registers a Community anybody may see.
 *
 * @param page - The Owner's page.
 * @param name - What the Community is called.
 * @returns The Community's path.
 */
export async function registerCommunity(
  page: Page,
  name: string,
): Promise<string> {
  await page.goto('/fleets/register');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);

  return new URL(page.url()).pathname;
}

/**
 * Registers a Fleet anybody may see into a Community.
 *
 * @param page - The Owner's page.
 * @param communityPath - The Community's path.
 * @param communityName - The Community's name, for the link that opens the form.
 * @param name - The Fleet's name, exactly as in game.
 * @param choices - Its platform, allegiance and recruitment.
 * @returns The Fleet's path.
 */
export async function registerFleet(
  page: Page,
  communityPath: string,
  communityName: string,
  name: string,
  choices: FleetChoices = {},
): Promise<string> {
  const { platform = 'Windows', allegiance = 'Federation' } = choices;

  await page.goto(communityPath);
  await page
    .getByRole('link', { name: `Register a Fleet into ${communityName}` })
    .click();
  await page.getByLabel('Name, exactly as in game').fill(name);
  await page.getByLabel('Platform').selectOption({ label: platform });

  if (allegiance !== null) {
    await page.getByLabel('Allegiance').selectOption({ label: allegiance });
  }

  if (choices.recruitment !== undefined) {
    await page
      .getByLabel('How people join')
      .selectOption({ label: choices.recruitment });
  }

  await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
  await page
    .getByRole('button', { name: 'Check for existing records' })
    .click();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/\/fleets\/[^/]+\/[^/]+$/);

  return new URL(page.url()).pathname;
}

/**
 * Registers a Federation Armada into a Community.
 *
 * @param page - The Owner's page.
 * @param communityPath - The Community's path.
 * @param communityName - The Community's name, for the link that opens the form.
 * @param name - The Armada's name, exactly as in game.
 * @param knownAs - What its people call it, if anything.
 * @param platform - Which platform; Windows unless said.
 * @returns The Armada's path.
 */
export async function registerArmada(
  page: Page,
  communityPath: string,
  communityName: string,
  name: string,
  knownAs?: string,
  platform = 'Windows',
): Promise<string> {
  await page.goto(communityPath);
  await page
    .getByRole('link', { name: `Register an Armada into ${communityName}` })
    .click();
  await page.getByLabel('Name, exactly as in game').fill(name);
  await page.getByLabel('Platform').selectOption({ label: platform });
  await page.getByLabel('Allegiance').selectOption({ label: 'Federation' });

  if (knownAs !== undefined) {
    await page.getByLabel('What you call it').fill(knownAs);
  }

  await page
    .getByRole('button', { name: 'Check for existing records' })
    .click();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/\/armadas\/[^/]+\/[^/]+$/);

  return new URL(page.url()).pathname;
}

/**
 * Confirms a Fleet nobody here runs.
 *
 * @param page - Anybody's page, signed in.
 * @param name - The Fleet's name, exactly as in game.
 * @param platform - Which platform; Windows unless said.
 * @returns The Fleet's path.
 */
export async function confirmStandaloneFleet(
  page: Page,
  name: string,
  platform = 'Windows',
): Promise<string> {
  await page.goto('/fleets/register-standalone');
  await page.getByLabel('Name, exactly as in game').fill(name);
  await page.getByLabel('Platform').selectOption({ label: platform });
  await page
    .getByRole('button', { name: 'Check for existing records' })
    .click();
  await page
    .getByLabel(
      'I understand that this record will belong to no Community, and that nobody will be able to change or close it afterwards.',
    )
    .check();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL(
    /\/fleets\/communities\/standalone\/fleets\/[^/]+\/[^/]+$/,
  );

  return new URL(page.url()).pathname;
}

/**
 * Asks, for a Fleet, to join an Armada, and approves it into a position:
 * both sides done by the Community's Owner, who manages each.
 *
 * @param page - The Owner's page.
 * @param fleetPath - The Fleet's path.
 * @param fleetName - The Fleet's name, as the Requests tab lists it.
 * @param armadaPath - The Armada's path.
 * @param armadaName - The Armada's name, as the Fleet's page offers it.
 * @param position - Alpha, Beta or Gamma.
 * @param underBeta - For a Gamma, the Beta it sits under.
 */
export async function placeInArmada(
  page: Page,
  fleetPath: string,
  fleetName: string,
  armadaPath: string,
  armadaName: string,
  position: 'Alpha' | 'Beta' | 'Gamma',
  underBeta?: string,
): Promise<void> {
  await page.goto(fleetPath);

  const ask = page.getByRole('form', { name: 'Ask to join an Armada' });

  await ask
    .getByLabel('Armada', { exact: true })
    .selectOption({ label: armadaName });
  await ask.getByRole('button', { name: 'Ask to join' }).click();
  await expect(
    page.getByText('Your request is on its way to the Armada’s managers.'),
  ).toBeVisible();

  await page.goto(`${armadaPath}/requests`);
  await page
    .getByRole('row')
    .filter({ hasText: fleetName })
    .getByRole('button', { name: 'Approve…' })
    .click();

  const approve = page.getByRole('form', { name: `Approve ${fleetName}` });

  await approve.getByLabel('Position').selectOption({ label: position });

  if (underBeta !== undefined) {
    await approve.getByLabel('Under').selectOption({ label: underBeta });
  }

  await approve.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(
    page.getByText(`${fleetName} joined the Armada.`, { exact: true }),
  ).toBeVisible();
}

/**
 * Joins an open Fleet with a Character.
 *
 * @param page - The joiner's page.
 * @param fleetPath - The Fleet's path.
 * @param character - The Character, as the form offers it.
 */
export async function joinFleet(
  page: Page,
  fleetPath: string,
  character: string,
): Promise<void> {
  await page.goto(fleetPath);
  await page
    .getByLabel('Your Character in this Fleet')
    .selectOption({ label: character });
  await page.getByRole('button', { name: 'Join this Fleet' }).click();
  await expect(
    page.getByRole('button', { name: 'Leave this Fleet' }),
  ).toBeVisible();
}

/** The first line of a roster export, as the game writes it. */
export const ROSTER_HEADER =
  'Character Name,Account Handle,Level,Class,Guild Rank,Contribution Total,Join Date,Rank Change Date,Last Active Date,Status,Public Comment,Public Comment Last Edit Date';

/**
 * One member's row in a roster export.
 *
 * @param name - The Character's name.
 * @param handle - The account's handle, without its `@`.
 * @param rank - The rank the game shows; Member unless said.
 * @returns The row.
 */
export const rosterRow = (
  name: string,
  handle: string,
  rank = 'Member',
): string =>
  `${name},@${handle},65,Starfleet Tactical Officer,${rank},120500,3/4/2023 8:15:00pm,6/1/2023 9:00:00am,1/1/2024 11:45:00am,"Offline","",`;

/**
 * Where a Character's own page is.
 *
 * @param person - Whose.
 * @returns The path.
 */
export const characterPathOf = (person: FleetPerson): string =>
  `/dashboard/accounts/${encodeURIComponent(person.accountHandle)}/${encodeURIComponent(person.characterName)}`;

/**
 * Imports a roster export into a Fleet, and waits for it to be read.
 *
 * @param page - The importer's page.
 * @param fleetPath - The Fleet's path.
 * @param fleetName - The Fleet's name, for the export's file name.
 * @param rows - The members' rows, after the header.
 * @param takenAt - The export's stamp, as the game names the file.
 * @returns The import's own page.
 */
export async function importRoster(
  page: Page,
  fleetPath: string,
  fleetName: string,
  rows: string[],
  takenAt = '20240101-120000',
): Promise<string> {
  await page.goto(`${fleetPath}/import`);
  await page.getByLabel('The export, as the game wrote it').setInputFiles({
    name: `${fleetName}_${takenAt}.Csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(`${[ROSTER_HEADER, ...rows].join('\r\n')}\r\n`, 'utf8'),
  });
  await page.getByLabel('The clock it was taken on').selectOption('UTC');
  await page.getByRole('button', { name: 'Check this export' }).click();
  await expect(page.getByText('Ready to import')).toBeVisible();
  await page.getByRole('button', { name: 'Import this export' }).click();
  await expect(page).toHaveURL(/\/investigate\/imports\/[^/]+$/);
  // Scanned by the local worker's clamd, then read into the roster.
  await expect(page.getByText('Imported', { exact: true })).toBeVisible({
    timeout: 180_000,
  });

  return new URL(page.url()).pathname;
}
