import { Locator, Page } from '@playwright/test';

/**
 * Presses Tab until a control has focus, as somebody using the keyboard alone
 * would (FC-044). Fails if it is never reached, so a control the Tab order
 * skips is caught.
 *
 * @param page - The page.
 * @param target - The control.
 * @param limit - How many presses to allow.
 */
export async function tabTo(
  page: Page,
  target: Locator,
  limit = 150,
): Promise<void> {
  for (let press = 0; press <= limit; press++) {
    if (await target.evaluate(element => element === document.activeElement)) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  throw new Error(`Tab never reached ${target.toString()}`);
}

/**
 * Tabs to a control and presses Enter on it.
 *
 * @param page - The page.
 * @param target - The control.
 */
export async function tabAndEnter(page: Page, target: Locator): Promise<void> {
  await tabTo(page, target);
  await page.keyboard.press('Enter');
}
