import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  Browser,
  BrowserContext,
  Page,
  test as base,
  TestInfo,
} from '@playwright/test';

import { backendSupport } from './backend';

/**
 * The people the Fleet journeys sign in as (FC-044).
 *
 * Made for the run by the backend's `fleet-begin` and removed by its
 * `fleet-finish`, so the journeys never touch a real member's data and need
 * nobody's password: each person's is generated for the run, written to a
 * file under `reports/` (which git ignores), and read back here. Their
 * addresses are at a domain reserved for testing, which the backend never
 * mails, so signing in sends nobody anything.
 */

/** Who the journeys sign in as. */
export type FleetRole =
  'owner' | 'applicant' | 'friend' | 'officer' | 'stranger' | 'admin';

export const FLEET_ROLES: readonly FleetRole[] = [
  'owner',
  'applicant',
  'friend',
  'officer',
  'stranger',
  'admin',
];

/** One of them, as the backend made them. */
export interface FleetPerson {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly accountHandle: string;
  readonly characterName: string;
}

/** Where the backend writes them. Absolute, because the backend runs elsewhere. */
export const FLEET_PEOPLE_FILE = resolve(
  'reports/playwright/.fleet-people.json',
);

/**
 * Where each person's signed-in session is kept between the setup and the
 * journeys.
 *
 * @param role - Whose.
 * @returns The path.
 */
export const fleetStateOf = (role: FleetRole): string =>
  `reports/playwright/.fleet-${role}.json`;

/**
 * Everyone made for this run.
 *
 * @returns The run's mark and the people, by role.
 */
export function fleetPeople(): {
  run: string;
  people: Record<FleetRole, FleetPerson>;
} {
  return JSON.parse(readFileSync(FLEET_PEOPLE_FILE, 'utf8')) as {
    run: string;
    people: Record<FleetRole, FleetPerson>;
  };
}

/** The Fleet support commands the backend runs for the journeys. */
export const fleetBackend = {
  /** Clears any earlier run, switches Fleet Community on, makes the people. */
  begin(): void {
    backendSupport('fleet-begin', FLEET_PEOPLE_FILE);
  },

  /** Removes the people and everything they made; puts the switch back. */
  finish(): void {
    backendSupport('fleet-finish', FLEET_PEOPLE_FILE);
  },

  /** Throws Fleet Community's master switch; the server reads it within ten seconds. */
  setFeature(state: 'on' | 'off'): void {
    backendSupport('fleet-flag', state);
  },

  /**
   * Removes the people's Communities and keeps the people. Each journey file
   * starts with it: an Owner may hold ten, closed ones included, and a run on
   * desktop and phone registers more than that.
   */
  clearCommunities(): void {
    backendSupport('fleet-clear-communities');
  },

  /** How much the disposable people left: all nought after a finish. */
  counts(): Record<string, number> {
    return backendSupport<Record<string, number>>('fleet-counts');
  },
};

/**
 * A distinctive name for something a journey makes, so the desktop and phone
 * runs, and any run that stopped early, never collide.
 *
 * @param info - The test, for its project.
 * @param what - What it names.
 * @returns The name.
 */
export function named(info: TestInfo, what: string): string {
  const device = info.project.name.includes('mobile') ? 'Phone' : 'Desk';
  // A retry runs its serial group again from the top, registering again.
  const attempt = info.retry === 0 ? '' : ` r${info.retry}`;

  return `Fc044 ${device} ${what} ${fleetPeople().run}${attempt}`;
}

/**
 * Opens a page as somebody, in the project's browser and screen.
 *
 * @param browser - The browser.
 * @param info - The test, for the project's settings.
 * @param role - Who, or null for nobody signed in.
 * @returns The context and its page.
 */
async function openAs(
  browser: Browser,
  info: TestInfo,
  role: FleetRole | null,
): Promise<{ context: BrowserContext; page: Page }> {
  const { viewport, isMobile, hasTouch, userAgent, deviceScaleFactor } =
    info.project.use;
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport,
    isMobile,
    hasTouch,
    userAgent,
    deviceScaleFactor,
    reducedMotion: info.project.use.reducedMotion,
    storageState: role === null ? undefined : fleetStateOf(role),
  });

  return { context, page: await context.newPage() };
}

/**
 * The refresh token a saved session holds, or null for none.
 *
 * @param state - The session, as Playwright saves it.
 * @returns The token.
 */
function refreshTokenIn(state: string): string | null {
  const { origins } = JSON.parse(state) as {
    origins: { localStorage: { name: string; value: string }[] }[];
  };

  return (
    origins
      .flatMap(origin => origin.localStorage)
      .find(item => item.name === 'refresh_token')?.value ?? null
  );
}

/**
 * Saves a person's session again when the test refreshed it.
 *
 * An access token lasts an hour, and refreshing it retires the refresh
 * token it was refreshed with. Every test opens its pages from the saved
 * session, so once one refreshes, every later test would present a retired
 * token and be signed out — which, a little over an hour in, is every test.
 * Only a session that still has a refresh token, and a different one from the
 * one it started with, is saved: a session that was signed out or revoked
 * leaves the saved one alone.
 *
 * @param context - The test's context for the person.
 * @param role - Who.
 * @param started - The refresh token it was opened with.
 */
async function keepRefreshedSession(
  context: BrowserContext,
  role: FleetRole,
  started: string | null,
): Promise<void> {
  const state = JSON.stringify(await context.storageState());
  const now = refreshTokenIn(state);

  if (now !== null && now !== started) {
    writeFileSync(fleetStateOf(role), state);
  }
}

/**
 * The journeys' test: `as(role)` opens a page as one of the people, and
 * `anonymous()` one signed in as nobody. Every context opened is closed after
 * the test.
 */
export const fleetTest = base.extend<{
  as: (role: FleetRole) => Promise<Page>;
  anonymous: () => Promise<Page>;
}>({
  as: async ({ browser }, use, info) => {
    const opened: {
      context: BrowserContext;
      role: FleetRole;
      started: string | null;
    }[] = [];

    await use(async role => {
      const started = refreshTokenIn(readFileSync(fleetStateOf(role), 'utf8'));
      const { context, page } = await openAs(browser, info, role);

      opened.push({ context, role, started });

      return page;
    });

    for (const { context, role, started } of opened) {
      await keepRefreshedSession(context, role, started);
      await context.close();
    }
  },
  anonymous: async ({ browser }, use, info) => {
    const contexts: BrowserContext[] = [];

    await use(async () => {
      const opened = await openAs(browser, info, null);

      contexts.push(opened.context);

      return opened.page;
    });

    for (const context of contexts) {
      await context.close();
    }
  },
});
