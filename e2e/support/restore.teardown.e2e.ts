import { test as teardown } from '@playwright/test';

import { backend } from './backend';
import { member } from './member';

/**
 * Runs once, after every journey, including when a journey failed.
 *
 * The journeys leave a member with a hierarchy, answers and — where one was
 * deleted late on — rows waiting out their retention window. None of that
 * should outlive the run. The feature flag goes back to off, because off is
 * how it is deployed. The account is enabled again here as well: a journey
 * that disables it has its own `finally`, and this is the copy that still
 * runs when that journey never reached it.
 *
 * Nothing here puts back a snapshot of the database from before the run.
 * `finish` purges this member's tracking data and switches the flag off.
 */

teardown('clear the member and switch the feature off', async () => {
  backend.setDisabled(member.email, 'off');
  backend.finish(member.email);
});
