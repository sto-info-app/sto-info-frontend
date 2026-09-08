import { test as base } from '@playwright/test';

import { CustomTrackingPage } from './custom-tracking.page';

/**
 * The journeys' own `test`, which hands each one the Custom Tracking screen
 * already wrapped up.
 */
export const test = base.extend<{ tracking: CustomTrackingPage }>({
  tracking: async ({ page }, use) => {
    const tracking = new CustomTrackingPage(page);

    await use(tracking);

    // Every test starts with the same amount of room, whatever ran before it.
    await tracking.tidyUp();
  },
});

export { expect } from '@playwright/test';
