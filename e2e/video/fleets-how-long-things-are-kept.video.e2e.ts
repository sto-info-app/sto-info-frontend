import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  click,
  glide,
  openClip,
  pause,
  readNotices,
} from './support/clip';
import { registerCommunity, registerFleet } from './support/prepare';

/**
 * The Fleets section's "How long things are kept" guide, as a video (13
 * October 2026): the Privacy Policy's table of times, an Activity page's
 * twelve months, a news post deleted, and where erasure is asked for.
 *
 * Off camera the Owner registers the Community and a Fleet, and publishes a
 * post to delete. The Owner records.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';
const TITLE = 'Old recruitment drive';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('How long things are kept', async ({ as, browser }, info) => {
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await owner.goto(`${fleetPath}/news`);
  await owner.getByRole('link', { name: 'Write a post' }).click();
  await owner.getByLabel('Title', { exact: true }).fill(TITLE);
  await owner
    .getByLabel('Post (Markdown)')
    .fill('We are recruiting for the spring season.');
  await owner.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(
    owner.getByRole('button', { name: 'Unpublish', exact: true }),
  ).toBeVisible();

  const postPath = new URL(owner.url()).pathname;

  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The times.
    await page.goto('/privacy-policy');
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Fleet Community keeps some things for a set time and then forgets them, on a daily schedule',
    );
    await pause(page, 3_000);
    await glide(
      page,
      page.getByRole('heading', { name: /How Long We Keep Your Data/ }),
    );
    await caption(
      page,
      'The same times are in the Privacy Policy, under How Long We Keep Your Data',
    );
    await pause(page, 3_000);
    await glide(page, page.getByText('Fleet roster files', { exact: true }));
    await caption(
      page,
      'Roster exports: the copy kept is deleted 180 days after upload. The history read from it stays',
    );
    await pause(page, 4_000);
    await glide(page, page.getByText('Fleet chat', { exact: true }));
    await caption(
      page,
      'Chat: members read back four hours, every message is deleted after 45 days, transcripts after 24 hours',
    );
    await pause(page, 4_500);

    // Activity's twelve months.
    await page.goto(`${fleetPath}/activity`);
    await caption(
      page,
      'Activity: the last twelve months. Events are never deleted',
    );
    await glide(
      page,
      page.getByText(/What has happened here in the last twelve months/),
    );
    await pause(page, 4_000);

    // Deleting a post.
    await page.goto(postPath);
    await caption(
      page,
      'A news post you delete disappears from its readers at once, and is removed for good 30 days later',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Delete', exact: true }),
    );
    await pause(page, 2_500);
    await caption(
      page,
      'It cannot be put back, so unpublish instead if you might want it again',
    );
    await click(
      page,
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete', exact: true }),
    );
    await pause(page, 3_500);

    // Erasure.
    await page.goto('/contact');
    await caption(
      page,
      'If a roster lists your Character, ask for erasure through Contact us, with or without an account',
    );
    await glide(page, page.getByLabel('Message'));
    await pause(page, 3_500);
    await caption(
      page,
      'Erasure replaces your name with Erased member in every Fleet’s roster. It cannot be undone',
    );
    await pause(page, 4_000);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(
      `Recorded ${await clip.finish('fleets-12-how-long-things-are-kept')}`,
    );
  }
});
