import { expect, test } from '@playwright/test';

import { apiOrigin } from '../support/api';
import {
  fixtureActors,
  MEMBER_STORAGE_STATE,
  storageStateFor,
} from '../support/actors';
import { readStorytimeFixture } from '../support/storytime-fixture';

/**
 * STORY-01, and the switched-on half of STORY-02.
 *
 * Actors: anonymous, the demonstration member (who can create), and member B
 * (who has been denied creator permission). Invitations and arcs stay
 * available to B, which is the proof those screens do not ask for it.
 */

const HOME = /https?:\/\/[^/]+\/?(\?.*)?$/;

test(
  'STORY-01 a published voyage can be read, and a draft cannot',
  { tag: '@high' },
  async ({ page, request }) => {
    const voyage = readStorytimeFixture();

    await expect(async () => {
      await page.goto('/storytime');
      await expect(page).not.toHaveURL(/unavailable/);
      await expect(
        page.getByRole('link', { name: /All Stories/ }),
      ).toBeVisible();
    }).toPass({ timeout: 25_000 });

    await page.getByRole('link', { name: /All Stories/ }).click();
    await expect(page).toHaveURL(/\/storytime\/stories$/);
    await expect(
      page.getByRole('link', { name: voyage.publishedTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: voyage.draftTitle, exact: true }),
    ).toHaveCount(0);

    await page
      .getByRole('link', { name: voyage.publishedTitle, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: voyage.publishedTitle }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: `Read ${voyage.openingTitle}`, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: voyage.openingTitle }),
    ).toBeVisible();
    await page
      .getByRole('link', {
        name: new RegExp(
          `Next Chapter:\\s*${escapeRegExp(voyage.continuingTitle)}`,
        ),
      })
      .click();
    await expect(
      page.getByRole('heading', { name: voyage.continuingTitle }),
    ).toBeVisible();
    await page
      .getByRole('link', {
        name: new RegExp(
          `Previous Chapter:\\s*${escapeRegExp(voyage.openingTitle)}`,
        ),
      })
      .click();
    await expect(
      page.getByRole('heading', { name: voyage.openingTitle }),
    ).toBeVisible();

    await page.goto(`/storytime/stories/${voyage.draftSlug}`);
    await expect(page.getByText('Story unavailable')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: voyage.draftTitle }),
    ).toHaveCount(0);

    const draft = await request.get(
      `${apiOrigin()}/storytime/stories/${voyage.draftSlug}`,
    );

    expect(draft.status()).toBe(404);
    expect(await draft.text()).not.toContain(voyage.draftSecret);
  },
);

test(
  'STORY-02 creator permission gates the editor, and not invitations or arcs',
  { tag: '@high' },
  async ({ browser }) => {
    const creator = await browser.newContext({
      storageState: MEMBER_STORAGE_STATE,
    });
    const creatorPage = await creator.newPage();

    try {
      await expect(async () => {
        await creatorPage.goto('/storytime/manage/stories/new');
        await expect(
          creatorPage.getByRole('heading', { name: 'Create a Story' }),
        ).toBeVisible();
      }).toPass({ timeout: 25_000 });
    } finally {
      await creator.close();
    }

    const reader = await browser.newContext({
      storageState: storageStateFor(fixtureActors.B.code),
    });
    const readerPage = await reader.newPage();

    try {
      await expect(async () => {
        await readerPage.goto('/storytime/manage/stories/new');
        await expect(readerPage).toHaveURL(HOME);
        await expect(
          readerPage.getByRole('heading', { name: /Welcome to the/ }),
        ).toBeVisible();
      }).toPass({ timeout: 25_000 });
      await expect(
        readerPage.getByRole('heading', { name: 'Create a Story' }),
      ).toHaveCount(0);

      await readerPage.goto('/storytime/manage/invitations');
      await expect(
        readerPage.getByRole('heading', { name: 'Invitations', exact: true }),
      ).toBeVisible();
      await expect(readerPage).toHaveURL(/\/storytime\/manage\/invitations$/);

      await readerPage.goto('/storytime/manage/arcs');
      await expect(
        readerPage.getByRole('heading', { name: 'Your Arcs', exact: true }),
      ).toBeVisible();
      await expect(readerPage).toHaveURL(/\/storytime\/manage\/arcs$/);
    } finally {
      await reader.close();
    }
  },
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
