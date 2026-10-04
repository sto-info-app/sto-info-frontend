import { expect, test as setup } from '@playwright/test';

import {
  FLEET_ROLES,
  fleetBackend,
  fleetPeople,
  fleetStateOf,
} from './fleet-people';

/**
 * Runs once, before the Fleet journeys (FC-044).
 *
 * Clears whatever an earlier run left, switches Fleet Community on, makes the
 * run's people, and signs each of them in through the login form, keeping
 * their sessions for the journeys. Through the form rather than by writing a
 * token into storage, because a token written by hand is a guess at what the
 * application stores.
 */
setup('make the run’s people and sign each in', async ({ browser }) => {
  fleetBackend.begin();

  const { people } = fleetPeople();

  for (const role of FLEET_ROLES) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/login');
    await page.getByLabel('Email').fill(people[role].email);
    await page.getByLabel('Password').fill(people[role].password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await context.storageState({ path: fleetStateOf(role) });
    await context.close();
  }
});
