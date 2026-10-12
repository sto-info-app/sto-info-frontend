import { Browser, expect, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE, storageStateFor } from '../support/actors';
import { fixtureActors } from '../support/actors';
import { backend } from '../support/backend';
import { member as demoMember } from '../support/member';

/**
 * REG-02 and FRIEND-01.
 *
 * Actors: the demonstration member and fixture member B, in two sessions.
 * B's registry listing is switched on for the request and switched off again.
 */

test(
  'REG-02 the registry lists, an empty search, and a missing record',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    await page.goto('/community/registry/profiles');
    await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible();

    await page.goto('/community/registry/recently-joined');
    await expect(
      page.getByRole('heading', { name: 'Recently Joined' }),
    ).toBeVisible();

    await page.goto('/community/registry/recently-active');
    await expect(
      page.getByRole('heading', { name: 'Recently Active' }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Recently Joined' }),
    ).toBeVisible();
    await page.goForward();
    await expect(
      page.getByRole('heading', { name: 'Recently Active' }),
    ).toBeVisible();

    await page.goto('/community/registry/search', {
      waitUntil: 'domcontentloaded',
    });
    const username = page.getByLabel('Username');
    await username.fill('zz-no-such-officer');
    // Clear only appears once the model has the term. Submitting before that
    // searches for everyone.
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
    await username.press('Enter');
    await expect(
      page.getByText('No officers match that search.'),
    ).toBeVisible();

    const next = page.getByRole('button', { name: 'Next', exact: true });
    if (await next.isVisible()) {
      await next.click();
      await expect(page).toHaveURL(/page=2/);
      await page.goBack();
    }

    await page.goto('/community/registry/profiles/no-such-officer-e2e');
    await expect(
      page.getByRole('heading', { name: 'Record not found' }),
    ).toBeVisible();
  },
);

test(
  'FRIEND-01 request, decline, accept, remove, block, and unblock',
  {
    tag: '@weekly',
  },
  async ({ browser }) => {
    test.setTimeout(360_000);
    const member = await signedIn(browser, MEMBER_STORAGE_STATE);
    const other = await signedIn(browser, storageStateFor('B'));

    const profile = backend.profileIdentity(fixtureActors.B.email);

    try {
      backend.writeProfileIdentity(
        fixtureActors.B.email,
        profile.username,
        profile.firstName,
        'public',
      );

      const username = fixtureActors.B.email.replace('@example.com', '');
      await member.page.goto(`/community/registry/profiles/${username}`, {
        waitUntil: 'domcontentloaded',
      });
      // An earlier run can leave a request, a friendship, or a block in place.
      // Those show a different action, so Add Friend is not on the page until
      // that is cleared.
      await startAsStrangers(member.page, username);
      await member.page.getByRole('button', { name: 'Add Friend' }).click();
      await expect(member.page.getByText(/request/i).first()).toBeVisible();

      await other.page.goto('/community/friends?tab=incoming', {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        other.page.getByRole('heading', { name: 'Requests Received' }),
      ).toBeVisible();
      await other.page
        .getByRole('button', { name: 'Decline', exact: true })
        .click();
      await confirm(other.page, 'Decline');
      await expect(other.page.getByText('Request declined.')).toBeVisible();

      await member.page.reload({ waitUntil: 'domcontentloaded' });
      await member.page.getByRole('button', { name: 'Add Friend' }).click();
      await other.page.reload({ waitUntil: 'domcontentloaded' });
      await other.page
        .getByRole('button', { name: 'Accept', exact: true })
        .click();
      await expect(
        other.page.getByText(`You and ${demoMember.username} are now friends.`),
      ).toBeVisible();

      await member.page.goto('/community/friends', {
        waitUntil: 'domcontentloaded',
      });
      await member.page
        .getByRole('button', { name: `Unfriend ${username}` })
        .click();
      await confirm(member.page, 'Remove');

      await member.page.goto(`/community/registry/profiles/${username}`, {
        waitUntil: 'domcontentloaded',
      });
      await member.page
        .getByRole('button', { name: 'Block', exact: true })
        .click();
      await confirm(member.page, 'Block');
      // A block hides both registry records, so the way back is the Blocked tab.
      await expect(
        member.page.getByText(`${username} was blocked.`),
      ).toBeVisible();
      await expect(
        member.page.getByRole('heading', { name: 'Record not found' }),
      ).toBeVisible();
      await unblockFromList(member.page, username);
      await member.page.goto(`/community/registry/profiles/${username}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        member.page.getByRole('button', { name: 'Add Friend' }),
      ).toBeVisible();
    } finally {
      backend.writeProfileIdentity(
        fixtureActors.B.email,
        profile.username,
        profile.firstName,
        profile.publiclyVisible ? 'public' : 'private',
      );
      await member.context.close();
      await other.context.close();
    }
  },
);

async function signedIn(
  browser: Browser,
  storageState: string,
): Promise<{
  context: Awaited<ReturnType<Browser['newContext']>>;
  page: Page;
}> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  return { context, page };
}

/**
 * Puts the open profile back to "Add Friend".
 *
 * Withdraw has no confirm step. Unfriend and decline do, and each confirm
 * button repeats the action name. A block removes the profile entirely, so
 * that one is lifted from the Blocked list.
 */
async function startAsStrangers(page: Page, username: string): Promise<void> {
  const missing = page.getByRole('heading', { name: 'Record not found' });
  const add = page.getByRole('button', { name: 'Add Friend' });
  const withdraw = page.getByRole('button', { name: 'Withdraw Request' });
  const unfriend = page.getByRole('button', { name: 'Unfriend' });
  const decline = page.getByRole('button', { name: 'Decline Request' });

  await expect(
    missing.or(add).or(withdraw).or(unfriend).or(decline).first(),
  ).toBeVisible();

  if (await missing.isVisible()) {
    await unblockFromList(page, username);
    await page.goto(`/community/registry/profiles/${username}`, {
      waitUntil: 'domcontentloaded',
    });
  } else if (await withdraw.isVisible()) {
    await withdraw.click();
    await expect(page.getByText('Friend request withdrawn.')).toBeVisible();
  } else if (await unfriend.isVisible()) {
    await unfriend.click();
    await confirm(page, 'Remove');
    await expect(page.getByText(/was removed from your friends/)).toBeVisible();
  } else if (await decline.isVisible()) {
    await decline.click();
    await confirm(page, 'Decline');
    await expect(page.getByText('Request declined.')).toBeVisible();
  }

  await expect(add).toBeVisible();
}

/** Lifts a block from the Blocked list, where it is kept once the profile is hidden. */
async function unblockFromList(page: Page, username: string): Promise<void> {
  await page.goto('/community/friends?tab=blocked', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Blocked' })).toBeVisible();
  await page
    .locator('li')
    .filter({ hasText: username })
    .getByRole('button', { name: 'Unblock', exact: true })
    .click();
  await confirm(page, 'Unblock');
  await expect(page.getByText(`${username} was unblocked.`)).toBeVisible();
}

/** The confirm dialog uses the same label as the button that opened it. */
async function confirm(page: Page, name: string): Promise<void> {
  await page
    .locator('#confirm-dialog-container')
    .getByRole('button', { name, exact: true })
    .click();
}
