import { expect, Locator, Page } from '@playwright/test';

import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
} from '../support/fleet-people';
import {
  caption,
  choose,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import {
  characterLabelOf,
  joinFleet,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Fleet chat" guide, as a video (13 October 2026):
 * the list of chats, the General channel, a channel added, a message with a
 * mention, a reply, a report, a deleted message, and a direct message to a
 * friend.
 *
 * Off camera the Owner registers the Community and an open Fleet, which the
 * applicant joins and greets. The Owner records. Transcript export is left
 * out: its storage is not configured locally.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';
const HAIL = 'Anyone up for a Task Force Operation tonight?';

/** The reader's list of chats. */
const chatsOf = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'Your chats' });

/**
 * One Community, Fleet or Armada in the list of chats, by its name.
 *
 * @param page - The page.
 * @param name - Its name.
 * @returns Its part of the list.
 */
const scopeIn = (page: Page, name: string): Locator =>
  chatsOf(page)
    .locator('section')
    .filter({ has: page.getByRole('link', { name, exact: true }) });

/**
 * A place's messages.
 *
 * @param page - The page.
 * @param place - Its title: `# General`, or the friend's username.
 * @returns The log.
 */
const logOf = (page: Page, place: string): Locator =>
  page.getByRole('log', { name: `Messages in ${place}` });

/**
 * A message the server has committed, by what it says.
 *
 * @param log - The log.
 * @param text - What it says.
 * @returns The message.
 */
const messageIn = (log: Locator, text: string): Locator =>
  log.locator('li[id^="chat-message-"]').filter({ hasText: text }).first();

/**
 * Presses one of a message's actions, which show once the message has the
 * pointer or focus.
 *
 * @param page - The page.
 * @param message - The message.
 * @param name - The action's name.
 */
async function pressAction(
  page: Page,
  message: Locator,
  name: string,
): Promise<void> {
  await glide(page, message);

  const button = message.getByRole('button', { name });

  await button.focus();
  await glide(page, button);
  await page.keyboard.press('Enter');
  await pause(page, 700);
}

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Fleet chat', async ({ as, browser }, info) => {
  const { people } = fleetPeople();
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(
    owner,
    communityPath,
    COMMUNITY,
    FLEET,
    {
      recruitment: 'Anyone eligible may join',
    },
  );
  const member = await as('applicant');

  await joinFleet(member, fleetPath, characterLabelOf(people.applicant));
  await member.goto('/chat');
  await scopeIn(member, FLEET).getByRole('link', { name: '# General' }).click();
  await member.getByLabel('Message # General').fill(HAIL);
  await member.getByRole('button', { name: 'Send' }).click();
  await expect(messageIn(logOf(member, '# General'), HAIL)).toBeVisible();
  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;
  const dialog = page.getByRole('dialog');

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The list of chats.
    await page.goto('/chat');
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'Chat has a page of its own. The list groups channels under each Community, Armada and Fleet',
    );
    await glide(
      page,
      chatsOf(page).getByRole('link', { name: FLEET, exact: true }),
    );
    await pause(page, 3_000);
    await click(
      page,
      scopeIn(page, FLEET).getByRole('link', { name: '# General' }),
    );

    const log = logOf(page, '# General');

    await expect(log).toBeVisible();
    await caption(
      page,
      'General: one standard channel for all its members. You can read back four hours',
    );
    await pause(page, 3_500);

    // Adding a channel.
    await caption(
      page,
      'Chat moderators can add up to three more channels, each with who reads it and who posts',
    );
    await click(
      page,
      scopeIn(page, FLEET).getByRole('button', { name: 'Add channel' }),
    );
    await typeInto(
      page,
      dialog.getByLabel('Name', { exact: true }),
      'Officers deck',
    );
    await choose(page, dialog.getByLabel('Who reads it'), 'Officers and up');
    await choose(page, dialog.getByLabel('Who posts in it'), 'Officers and up');
    await click(page, dialog.getByRole('button', { name: 'Add channel' }));
    await expect(
      page.getByRole('region', { name: '# Officers deck' }),
    ).toBeVisible();
    await pause(page, 2_500);
    await click(
      page,
      scopeIn(page, FLEET).getByRole('link', { name: '# General' }),
    );

    // A mention.
    await caption(
      page,
      'Type @ and the start of a name, then pick from the list. Only people picked are mentioned and told',
    );

    const composer = page.getByLabel('Message # General');

    await typeInto(
      page,
      composer,
      `Yes, count me in @${people.applicant.username.slice(0, 4)}`,
    );
    await click(
      page,
      page
        .getByRole('listbox', { name: 'People to mention' })
        .getByRole('option', { name: people.applicant.username }),
    );
    await click(page, page.getByRole('button', { name: 'Send' }));
    await pause(page, 2_500);

    // A reply.
    await caption(
      page,
      'Reply shows Replying to above what you type. Enter sends; Shift+Enter starts a new line',
    );
    await pressAction(
      page,
      messageIn(log, HAIL),
      `Reply to ${people.applicant.username}`,
    );
    await expect(
      page.locator('span', { hasText: 'Replying to' }).first(),
    ).toBeVisible();
    await typeInto(
      page,
      composer,
      'Eight o’clock, then. I will bring the Beta.',
    );
    await click(page, page.getByRole('button', { name: 'Send' }));
    await pause(page, 2_000);
    await caption(
      page,
      'A sent reply carries their name and the first 80 characters of their message',
    );
    await pause(page, 3_500);

    // A report.
    await caption(
      page,
      'Report sends a message to the site’s administrators, never to the Fleet’s own officers',
    );
    await pressAction(
      page,
      messageIn(log, HAIL),
      `Report the message from ${people.applicant.username}`,
    );
    await choose(page, dialog.getByLabel('Reason'), 'Something else');
    await typeInto(
      page,
      dialog.getByLabel('What is wrong'),
      'Reported to show how a report is made.',
    );
    await click(page, dialog.getByRole('button', { name: 'Send report' }));
    await expect(
      page.getByText('Thanks, a site admin will look at it.'),
    ).toBeVisible();
    await caption(
      page,
      'You are thanked, and not told what happens. The person reported is never told',
    );
    await pause(page, 3_000);
    await click(page, page.getByRole('button', { name: 'OK' }));

    // Deleting.
    await caption(
      page,
      'Delete, beside your own message, leaves Message deleted in its place. Messages cannot be edited',
    );
    await pressAction(
      page,
      messageIn(log, 'Eight o’clock, then.'),
      'Delete your message',
    );
    await click(page, dialog.getByRole('button', { name: 'Delete' }));
    await expect(log.getByText('Message deleted').first()).toBeVisible();
    await pause(page, 3_000);

    // A direct message.
    await caption(
      page,
      'Direct messages are only between friends. A dot marks a friend who is online',
    );
    await page.goto(`/community/registry/profiles/${people.friend.username}`);
    await caption(
      page,
      'To start a conversation with a friend, open their profile and choose Message',
    );
    await click(
      page,
      page.getByRole('button', { name: 'Message', exact: true }),
    );
    await expect(page).toHaveURL(/\/chat/);
    await typeInto(
      page,
      page.getByLabel(`Message ${people.friend.username}`),
      'Are you coming on Friday?',
    );
    await click(page, page.getByRole('button', { name: 'Send' }));
    await pause(page, 2_500);
    await caption(
      page,
      'Every message is deleted 45 days after it was sent. Chat is for talking now',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-11-chat')}`);
  }
});
