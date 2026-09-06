import { test as teardown } from '@playwright/test';

import { backend } from './backend';
import { member } from './member';

/**
 * Runs once, after every journey.
 *
 * The journeys leave a member with a hierarchy, answers and — where one was
 * deleted late on — rows waiting out their retention window. None of that
 * should outlive the run, and the feature flag has to go back to off, because
 * off is how it is deployed.
 */

teardown('put everything back', async () => {
  backend.finish(member.email);
});
