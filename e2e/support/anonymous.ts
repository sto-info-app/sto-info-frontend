import { Browser, Page } from '@playwright/test';

/**
 * Look at the site the way a stranger would.
 *
 * A fresh context with no stored session: the journeys' own browser is signed
 * in as the owner, and the owner sees everything by definition, so nothing
 * about publication can be proved from it.
 */
export async function anonymously(
  browser: Browser,
  visit: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  try {
    await visit(page);
  } finally {
    await context.close();
  }
}
