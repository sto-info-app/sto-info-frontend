import { test } from '@playwright/test';

import { fixtureActors } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';

/**
 * Puts creator permission back and switches Storytime off.
 * Off is how the feature is left, including when a case failed.
 */

test('remove the voyage and switch Storytime off', () => {
  backend.storytimeFinish(member.email, fixtureActors.B.email);
});
