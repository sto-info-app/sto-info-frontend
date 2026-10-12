import { expect, test } from '@playwright/test';

import { apiOrigin } from '../support/api';
import { backend, SeededNews } from '../support/backend';

/**
 * NEWS-01. A published post opens by its slug and survives a reload. A draft
 * is not on the list and is not served by the slug.
 *
 * Actors: anonymous. The posts are created through the news service and
 * removed afterwards.
 */

let news: SeededNews;

test.beforeAll(() => {
  news = backend.seedNews();
});

test.afterAll(() => {
  backend.clearNews();
});

test(
  'NEWS-01 a published post reloads and a draft is not disclosed',
  { tag: '@high' },
  async ({ page, request }) => {
    await page.goto('/news');
    await expect(
      page.getByRole('heading', { name: 'News & Release Notes' }),
    ).toBeVisible();
    await expect(page.getByText(news.draftSecret)).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: news.draftTitle, exact: true }),
    ).toHaveCount(0);

    await page
      .getByRole('link', { name: news.publishedTitle, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: news.publishedTitle }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/news/${news.publishedSlug}$`));
    await page.reload();
    await expect(
      page.getByRole('heading', { name: news.publishedTitle }),
    ).toBeVisible();

    const list = await request.get(`${apiOrigin()}/news`);
    const draft = await request.get(`${apiOrigin()}/news/${news.draftSlug}`);
    const published = await request.get(
      `${apiOrigin()}/news/${news.publishedSlug}`,
    );

    expect(list.status()).toBe(200);
    expect(await list.text()).not.toContain(news.draftSecret);
    expect(await list.text()).not.toContain(news.draftTitle);
    expect(draft.status()).toBe(404);
    expect(await draft.text()).not.toContain(news.draftSecret);
    expect(published.status()).toBe(200);
    expect(await published.text()).toContain(news.publishedTitle);
  },
);
