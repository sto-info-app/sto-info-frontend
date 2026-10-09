import { APIRequestContext, expect, test } from '@playwright/test';

import { apiOrigin, authed } from '../support/api';
import { MEMBER_STORAGE_STATE, storageStateFor } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug, publication } from '../support/snapshot';

/**
 * PRIV-01 and PRIV-02.
 *
 * Actors: anonymous, the demonstration member, and member B. Publication
 * flags and the private account's notes are put back in `finally`.
 */

test(
  'PRIV-01 a visitor can read what is public, and a withdrawn account disappears at once',
  { tag: '@high' },
  async ({ browser, request }) => {
    const shot = backend.snapshot(member.email);
    const publicAccount = accountBySlug(shot, member.publicAccount);
    const privateAccount = accountBySlug(shot, member.privateAccount);
    const publicCaptain = publicAccount.characters.find(
      character => character.publiclyVisible,
    );
    const privateCaptain = privateAccount.characters[0];
    const secret = `e2e-private-${Date.now().toString(36)}`;

    if (!publicCaptain || !privateCaptain) {
      throw new Error('The demonstration accounts have no captain to publish.');
    }

    backend.setAccountNote(member.email, privateAccount.handleSlug, secret);

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(`/community/registry/profiles/${shot.publicUsername}`);
        await expect(
          page.getByRole('heading', { name: shot.publicUsername, exact: true }),
        ).toBeVisible();

        await page.goto(`/community/registry/profiles/${shot.privateUsername}`);
        await expect(
          page.getByRole('heading', { name: 'Record not found' }),
        ).toBeVisible();
        await expect(page.getByText(secret)).toHaveCount(0);

        await page.goto(pagePath(member.username, publicAccount.handleSlug));
        await expect(
          page.getByRole('heading', { name: `@${publicAccount.handle}` }),
        ).toBeVisible();

        await page.goto(pagePath(member.username, privateAccount.handleSlug));
        await expect(
          page.getByRole('heading', { name: 'Account not found' }),
        ).toBeVisible();
        await expect(page.getByText(secret)).toHaveCount(0);

        await page.goto(
          pagePath(
            member.username,
            publicAccount.handleSlug,
            publicCaptain.slug,
          ),
        );
        await expect(
          page.getByRole('heading', {
            name: publicCaptain.handle,
            exact: true,
          }),
        ).toBeVisible();

        await page.goto(
          pagePath(
            member.username,
            privateAccount.handleSlug,
            privateCaptain.slug,
          ),
        );
        await expect(
          page.getByRole('heading', { name: 'Captain not found' }),
        ).toBeVisible();
        await expect(page.getByText(secret)).toHaveCount(0);
      } finally {
        await context.close();
      }

      await expectShown(
        request,
        `/registry/profiles/${shot.publicUsername}`,
        shot.publicUsername,
      );
      await expectHidden(
        request,
        `/registry/profiles/${shot.privateUsername}`,
        secret,
      );
      await expectShown(
        request,
        apiPath(member.username, publicAccount.handleSlug),
        publicAccount.handle,
      );
      await expectHidden(
        request,
        apiPath(member.username, privateAccount.handleSlug),
        secret,
      );
      await expectHidden(
        request,
        apiPath(
          member.username,
          privateAccount.handleSlug,
          privateCaptain.slug,
        ),
        secret,
      );

      const owner = await browser.newContext({
        storageState: MEMBER_STORAGE_STATE,
      });
      const ownerPage = await owner.newPage();

      try {
        await ownerPage.goto(
          `/dashboard/accounts/${publicAccount.handle}/edit`,
        );
        const toggle = ownerPage.getByRole('switch', {
          name: 'Publicly Visible',
        });

        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await ownerPage
          .getByRole('button', { name: 'Save', exact: true })
          .click();
        await expect(
          ownerPage.getByRole('heading', {
            name: `Account: ${publicAccount.handle}`,
          }),
        ).toBeVisible();
      } finally {
        await owner.close();
      }

      await expect
        .poll(async () => {
          const response = await request.get(
            `${apiOrigin()}${apiPath(member.username, publicAccount.handleSlug)}`,
          );

          return response.status();
        })
        .toBe(404);
    } finally {
      backend.restoreAccounts(
        member.email,
        publicAccount.handleSlug,
        publication(publicAccount.publiclyVisible),
        privateAccount.handleSlug,
        publication(privateAccount.publiclyVisible),
        privateAccount.handleSlug,
        privateAccount.notes,
      );
    }
  },
);

test(
  'PRIV-02 another member cannot read or change a private account by its id',
  { tag: '@high' },
  async ({ browser }) => {
    const shot = backend.snapshot(member.email);
    const privateAccount = accountBySlug(shot, member.privateAccount);
    const character = privateAccount.characters[0];

    if (!character) {
      throw new Error('The private demonstration account has no captain.');
    }

    const context = await browser.newContext({
      storageState: storageStateFor('B'),
    });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard');

      const readAccount = await authed(page, `/account/${privateAccount.id}`);
      const writeAccount = await authed(
        page,
        `/account/${privateAccount.id}`,
        'PUT',
        JSON.stringify({ notes: 'e2e-should-not-land' }),
      );
      const readCharacter = await authed(page, `/character/${character.id}`);
      const writeCharacter = await authed(
        page,
        `/character/${character.id}`,
        'PUT',
        JSON.stringify({ biography: 'e2e-should-not-land' }),
      );

      expect(readAccount.status).toBe(403);
      expect(readAccount.body).toContain(
        'You do not have access to this account',
      );
      expect(writeAccount.status).toBe(403);
      expect(writeAccount.body).toContain(
        'You do not have access to this account',
      );
      expect(readCharacter.status).toBe(403);
      expect(readCharacter.body).toContain(
        'You do not have access to this character',
      );
      expect(writeCharacter.status).toBe(403);
      expect(writeCharacter.status).not.toBe(500);
    } finally {
      await context.close();
    }

    const after = backend.snapshot(member.email);

    expect(accountBySlug(after, member.privateAccount).notes).toBe(
      privateAccount.notes,
    );
    expect(
      accountBySlug(after, member.privateAccount).characters.find(
        item => item.id === character.id,
      )?.notes,
    ).toBe(character.notes);
  },
);

function pagePath(username: string, ...rest: string[]): string {
  return `/community${apiPath(username, ...rest)}`;
}

function apiPath(username: string, ...rest: string[]): string {
  return `/registry/profiles/${[username, ...rest]
    .map(segment => encodeURIComponent(segment))
    .join('/')}`;
}

async function expectShown(
  request: APIRequestContext,
  path: string,
  marker: string,
): Promise<void> {
  const response = await request.get(`${apiOrigin()}${path}`);

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(marker);
}

async function expectHidden(
  request: APIRequestContext,
  path: string,
  secret: string,
): Promise<void> {
  const response = await request.get(`${apiOrigin()}${path}`);

  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain(secret);
}
