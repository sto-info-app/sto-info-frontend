import { test as setup } from '@playwright/test';

import { backend } from './backend';
import { member } from './member';

/**
 * Switches Custom Tracking on and clears this member's tracking data.
 *
 * Only the journeys depend on this. Signing in, and the isolation checks,
 * do not.
 */

setup('switch custom tracking on and clear this member', async () => {
  backend.begin(member.email);
});
