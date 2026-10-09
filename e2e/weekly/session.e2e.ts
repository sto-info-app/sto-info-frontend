import { readFileSync } from 'node:fs';

import { expect, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';

/**
 * AUTH-05 and HEALTH-01.
 *
 * The inactivity window is hours long. These cases move the stored deadline
 * and the page clock instead of waiting it out. The outage is the API from
 * this browser: health checks fail until the route is restored.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'AUTH-05 a short deadline warns, refreshes, and then signs out',
  {
    tag: '@weekly',
  },
  async ({ browser }) => {
    // A fresh context, so the saved four-hour window is not written back over
    // the six-minute one this case installs before the page starts.
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await test.step('the warning offers a refresh', async () => {
        await armShortSession(page);
        await page.goto('/dashboard');
        await expect(
          page.getByRole('heading', { name: 'Dashboard', exact: true }),
        ).toBeVisible();
        // Movement re-arms the short window and starts the countdown the
        // warning dialog refuses to open without.
        await page
          .getByRole('heading', { name: 'Dashboard', exact: true })
          .hover();
        await page.clock.fastForward(75_000);
        await expect(
          page.getByRole('button', { name: 'Stay connected' }),
        ).toBeVisible();

        const refresh = page.waitForResponse(
          response => response.url().includes('/auth/refresh') && response.ok(),
        );
        await page.getByRole('button', { name: 'Stay connected' }).click();
        await refresh;
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator('#header-logout-link')).toBeAttached();
      });

      await test.step('ignoring the warning ends the session', async () => {
        await page.goto('/dashboard');
        await expect(
          page.getByRole('heading', { name: 'Dashboard', exact: true }),
        ).toBeVisible();
        await page.clock.fastForward(6 * 60 * 1000 + 15_000);
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByLabel('Email')).toBeVisible();
      });
    } finally {
      await context.close();
    }
  },
);

test(
  'HEALTH-01 an API outage replaces an API page and leaves a static page usable',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await page.clock.install();
    await page.route('**/health/ready', route => route.abort());
    await page.route('http://localhost:3004/**', route => route.abort());
    await page.route('http://127.0.0.1:3004/**', route => route.abort());

    await page.goto('/login');
    await page.clock.fastForward(45_000);
    await expect(
      page.getByRole('heading', { name: 'Service Unavailable' }),
    ).toBeVisible();

    await page.goto('/about');
    await expect(
      page.getByRole('heading', { level: 1, name: /About the/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Service Unavailable' }),
    ).toHaveCount(0);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.goto('/login');
    await page.clock.fastForward(5_000);
    await expect(page.getByLabel('Email')).toBeVisible();
  },
);

/**
 * Installs a paused clock and a six-minute inactivity window.
 *
 * Activity on load recomputes the deadline from the stored timeout, and the
 * warning sits five minutes before that deadline. Six minutes leaves the
 * warning one minute ahead, which the clock can reach without waiting.
 */
/**
 * The access token already in the shared sign-in file.
 *
 * The warning's refresh is answered in the browser, so this is handed back
 * unchanged and the file's own refresh token is never rotated.
 */
function storedSession(): { accessToken: string; refreshToken: string } {
  const state = JSON.parse(readFileSync(MEMBER_STORAGE_STATE, 'utf8')) as {
    origins?: { localStorage?: { name: string; value: string }[] }[];
  };
  const items =
    state.origins?.flatMap(origin => origin.localStorage ?? []) ?? [];
  const accessToken = items.find(item => item.name === 'access_token')?.value;
  const refreshToken = items.find(item => item.name === 'refresh_token')?.value;

  if (!accessToken || !refreshToken) {
    throw new Error('The member sign-in file has no session.');
  }

  return { accessToken, refreshToken };
}

async function armShortSession(page: Page): Promise<void> {
  // Answer refresh and logout in the browser. Hitting the API would rotate
  // or revoke the shared sign-in, and every later case loads that same file.
  const session = storedSession();
  await page.route('**/auth/refresh', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.accessToken,
        refresh_token: 'weekly-refresh',
        expires_in: 3600,
        session_timeout_minutes: 6,
      }),
    }),
  );
  await page.route('**/auth/logout', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    }),
  );
  await page.clock.install();
  await page.addInitScript(stored => {
    const now = Date.now();
    const timeoutMinutes = 6;
    const expiresAt = now + timeoutMinutes * 60 * 1000;
    localStorage.setItem('access_token', stored.accessToken);
    localStorage.setItem('refresh_token', stored.refreshToken);
    localStorage.setItem('session_timeout_mins', String(timeoutMinutes));
    localStorage.setItem('last_activity_at', String(now));
    localStorage.setItem('expires_at', String(expiresAt));
    localStorage.setItem('warning_at', String(expiresAt - 5 * 60 * 1000));
    localStorage.setItem('access_expires_at', String(now + 60 * 60 * 1000));
  }, session);
}
