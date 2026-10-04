import { expect, test as teardown } from '@playwright/test';

import { fleetBackend } from './fleet-people';

/**
 * Runs once, after the Fleet journeys (FC-044): removes the run's people and
 * everything they made, puts Fleet Community's switch back as it was found,
 * and checks nothing of theirs is left.
 *
 * E2E_FLEET_KEEP=1 leaves them in place, to look at what a failed journey
 * left behind; the next run's setup removes them first.
 */
teardown('remove the run’s people and everything they made', () => {
  teardown.skip(
    process.env['E2E_FLEET_KEEP'] === '1',
    'E2E_FLEET_KEEP=1: the run’s people are left in place',
  );

  fleetBackend.finish();

  expect(fleetBackend.counts()).toEqual({
    people: 0,
    communities: 0,
    profiles: 0,
  });
});
