import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import { PICTURE, registerCommunity, registerFleet } from './support/prepare';

/**
 * The Fleets section's "News and activity" guide, as a video (13 October
 * 2026): a post written, previewed and saved as a draft, given a cover,
 * published to the Community, the badge in the list, the Activity tab, and
 * Your Fleet activity on the Dashboard.
 *
 * Off camera the Owner registers the Community and a Fleet, and follows the
 * Community so that its activity reaches their Dashboard. The Owner
 * records.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';
const TITLE = 'Starbase upgrade complete';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('News and activity', async ({ as, browser }, info) => {
  test.setTimeout(900_000);

  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await owner.goto(communityPath);
  await owner.getByRole('button', { name: 'Follow this Community' }).click();
  await expect(
    owner.getByRole('button', { name: 'Stop following' }),
  ).toBeVisible();
  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // Writing.
    await page.goto(`${fleetPath}/news`);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Every Community, Fleet and Armada has news of its own, on its News tab',
    );
    await pause(page, 3_000);
    await click(page, page.getByRole('link', { name: 'Write a post' }));
    await caption(
      page,
      'A Title, a Summary for the news list, and the Post in Markdown',
    );
    await typeInto(page, page.getByLabel('Title'), TITLE);
    await typeInto(
      page,
      page.getByLabel('Summary (optional)'),
      'Tier 3 Starbase, as of this week.',
    );
    await typeInto(
      page,
      page.getByLabel('Post (Markdown)'),
      'The **Starbase** reached Tier 3 on Friday. Thanks to everybody who contributed.',
    );
    await caption(page, 'Preview shows how it will read; Write takes you back');
    await click(page, page.getByRole('button', { name: 'Preview' }));
    await pause(page, 3_000);
    await click(page, page.getByRole('button', { name: 'Write', exact: true }));
    await caption(
      page,
      'Who may read it: never more people than can see the Fleet itself',
    );
    await click(
      page,
      page.getByRole('radio', {
        name: 'The Community’s followers and members',
      }),
    );
    await pause(page, 2_000);
    await caption(
      page,
      'Save draft keeps it where only the news writers can read it',
    );
    await click(page, page.getByRole('button', { name: 'Save draft' }));
    await expect(page).toHaveURL(/\/news\/[^/]+\/edit$/);

    const postPath = new URL(page.url()).pathname.replace(/\/edit$/, '');

    // A cover.
    await caption(
      page,
      'Once saved as a draft, Set the cover beneath the editor',
    );
    await click(page, page.getByRole('button', { name: 'Set the cover' }));

    const dialog = page.getByRole('dialog');

    await dialog
      .getByLabel('Choose a picture for the Cover')
      .setInputFiles(PICTURE);
    await pause(page, 2_000);
    await typeInto(
      page,
      dialog.getByLabel('What does this picture show?'),
      'The Starbase at Tier 3, from orbit.',
    );
    await click(page, dialog.getByRole('button', { name: 'Upload' }));
    await caption(page, 'A new cover is checked for safety before it appears');
    await expect(dialog).toBeHidden({ timeout: 120_000 });
    await pause(page, 2_500);

    // Publishing.
    await page.goto(postPath);
    await caption(
      page,
      'Publish puts it in front of its readers, dated from that moment',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Publish', exact: true }),
    );
    await expect(
      page.getByRole('button', { name: 'Unpublish', exact: true }),
    ).toBeVisible();
    await glide(page, page.getByText(/^For:/).first());
    await caption(
      page,
      'The post’s page says who it is For. Unpublish takes it back to a draft',
    );
    await pause(page, 3_500);
    await page.goto(`${fleetPath}/news`);
    await glide(page, page.locator('.fleet-news-card__audience').first());
    await caption(
      page,
      'Each post in the list is a card whose bar says Public, Community or Members only',
    );
    await pause(page, 3_500);

    // Activity.
    await page.goto(`${fleetPath}/activity`);
    await caption(
      page,
      'Activity: one sentence per item, newest first, written from how things stand now',
    );
    await pause(page, 4_000);
    await page.goto('/dashboard/fleets');
    await caption(
      page,
      'Your Fleet activity, on Communities You Follow, gathers what happened where you follow or belong',
    );
    await glide(
      page,
      page.getByText('Your Fleet activity', { exact: true }).first(),
    );
    await pause(page, 4_000);
    await caption(
      page,
      'Activity is something you look at. A notification is sent to you alone, because it needs you',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-09-news-and-activity')}`);
  }
});
