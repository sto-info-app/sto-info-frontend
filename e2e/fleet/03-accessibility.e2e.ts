import { expect, Page } from '@playwright/test';

import { noViolations } from '../support/axe';
import {
  fleetBackend,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * Accessibility, keyboard and reduced motion across Fleet Community
 * (FC-044): axe against WCAG 2.1 A and AA on every Fleet, chat, settings,
 * Help and site administration page, scoped to the page's own content (the
 * site's frame is shared by every page and is checked with Help's); a tab
 * strip and a dialog driven by the keyboard alone; and nothing moving for a
 * reader whose system asks for less motion.
 */

/**
 * Opens a page and waits until it has settled.
 *
 * @param page - The page.
 * @param path - Where.
 */
async function settle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main'), `${path} drew its page`).toBeVisible();
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe.serial('Fleet Community, mechanically accessible', () => {
  let communityPath: string;
  let fleetPath: string;

  test('a Community and a Fleet to look at', async ({ as }, info) => {
    const page = await as('owner');
    const communityName = named(info, 'A11y Community');

    await page.goto('/fleets/register');
    await page.getByLabel('Name', { exact: true }).fill(communityName);
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/communities\/[^/]+$/);
    communityPath = new URL(page.url()).pathname;

    await page
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await page
      .getByLabel('Name, exactly as in game')
      .fill(named(info, 'A11y Fleet'));
    await page.getByLabel('Platform').selectOption({ label: 'Windows' });
    await page.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await page
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/fleets\/windows\/[^/]+$/);
    fleetPath = new URL(page.url()).pathname;
  });

  // The Owner's pages, a few to a test: axe sends its whole script and its
  // findings through every check, and one page for all of them left the
  // phone's trace too big for the runner to save when the page closed.
  const ownerPages: [string, () => string[]][] = [
    [
      'the Owner’s dashboard and the Fleet Community lists',
      () => [
        '/dashboard/fleets',
        '/dashboard/settings',
        '/fleets',
        '/fleets/communities',
        '/fleets/armadas',
        '/fleets/register',
        '/fleets/register-standalone',
        '/fleets/applications',
      ],
    ],
    [
      'the Owner’s Community, and their Fleet’s page, news and activity',
      () => [
        communityPath,
        `${communityPath}/manage`,
        `${communityPath}/manage/settings`,
        fleetPath,
        `${fleetPath}/news`,
        `${fleetPath}/news/write`,
        `${fleetPath}/activity`,
      ],
    ],
    [
      'the Owner’s Fleet events, holdings, import and recruitment',
      () => [
        `${fleetPath}/events`,
        `${fleetPath}/events/new`,
        `${fleetPath}/holdings`,
        `${fleetPath}/import`,
        `${fleetPath}/recruitment`,
        `${fleetPath}/recruitment/settings`,
        `${fleetPath}/recruitment/applications`,
        `${fleetPath}/recruitment/members`,
      ],
    ],
    [
      'the Owner’s Fleet management, chat and Help',
      () => [
        `${fleetPath}/manage`,
        `${fleetPath}/manage/settings`,
        '/chat',
        '/help/topics/fleets',
        '/help/fleet-chat',
        '/help/topics/settings',
      ],
    ],
  ];

  for (const [pages, paths] of ownerPages) {
    test(`${pages} pass axe`, async ({ as }) => {
      const page = await as('owner');

      for (const path of paths()) {
        await settle(page, path);
        await noViolations(page, path);
      }
    });
  }

  test('every page a site admin reaches for Fleet Community passes axe', async ({
    as,
  }) => {
    const page = await as('admin');

    for (const path of [
      '/admin/chat-reports',
      '/admin/holds',
      '/admin/fleet-investigations',
      '/admin/fleet-disputes',
      '/admin/roster-erasures',
      '/admin/scan-diagnostics',
      '/admin/security-log',
      '/help/topics/site-admin',
    ]) {
      await settle(page, path);
      await noViolations(page, path);
    }
  });

  test('the keyboard moves along a Fleet’s tabs and opens one', async ({
    as,
  }) => {
    const page = await as('owner');

    await settle(page, fleetPath);

    const tabs = page
      .getByRole('navigation', { name: 'Fleet sections' })
      .last()
      .getByRole('link');
    const first = tabs.first();

    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tabs.nth(1)).toBeFocused();

    const name = (await tabs.nth(1).textContent())!.trim();

    await page.keyboard.press('Enter');
    await expect(
      page
        .getByRole('navigation', { name: 'Fleet sections' })
        .last()
        .getByRole('link', { name, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('a dialog opens from the keyboard, Escape closes it, and focus comes back', async ({
    as,
  }) => {
    const page = await as('owner');

    await settle(page, `${communityPath}/manage`);

    const close = page.getByRole('button', { name: 'Close…' });

    await close.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(close).toBeFocused();
  });

  // Signed out, so nothing is unread: the header's cascade, the motion this
  // checks is still there without the setting, gives way to an unread notice,
  // and every new account starts with one.
  test('nothing moves for a reader who asks for less motion', async ({
    anonymous,
  }) => {
    const page = await anonymous();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await settle(page, fleetPath);

    const moving = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter(element => {
          const style = getComputedStyle(element);

          return (
            style.animationName !== 'none' ||
            style.transitionDuration
              .split(',')
              .some(duration => Number.parseFloat(duration) > 0)
          );
        })
        .map(element => element.className.toString())
        .slice(0, 5),
    );

    expect(moving).toEqual([]);

    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const cascade = page.locator('.data-cascade .row-1').first();

    await expect(cascade, 'the header draws its cascade').toBeAttached();

    const cascading = await cascade.evaluate(
      element => getComputedStyle(element).animationName,
    );

    expect(cascading).not.toBe('none');
  });
});
