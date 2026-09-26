import { mkdirSync, writeFileSync } from 'node:fs';

import { test } from '@playwright/test';

import { fixtureActors } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';
import { STORYTIME_FIXTURE } from '../support/storytime-fixture';

/**
 * Switches Storytime on for the cases that need it, and only those cases.
 * The off case has already run. Teardown removes what this publishes.
 */

test('publish a voyage with Storytime switched on', () => {
  const seeded = backend.storytimeBegin(member.email, fixtureActors.B.email);

  mkdirSync('reports/playwright', { recursive: true });
  writeFileSync(STORYTIME_FIXTURE, JSON.stringify(seeded));
});
