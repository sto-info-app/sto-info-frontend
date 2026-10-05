import { expect, Locator, Page } from '@playwright/test';

import { backendSupport } from '../support/backend';
import {
  fleetBackend,
  fleetPeople,
  fleetTest as test,
  named,
} from '../support/fleet-people';

/**
 * The signed-in chat checks owed by FC-031, FC-033, FC-034 and FC-035
 * (FC-044): the list and its channels, custom channels and their limit, who
 * reads and posts where, mentions, replies and deletions and the notices they
 * send, direct messages from a profile and the one notice somebody away is
 * sent until they read them, presence and appearing offline,
 * typing, toasts, blocks, reports and their evidence, and the list and an
 * open chat stacked on a narrow screen.
 *
 * Transcript export (FC-035) is left out: its storage keys are not configured
 * locally. Everything a check changes about a person — a block, appearing
 * offline, sharing typing — is put back, because the phone's run signs in as
 * the same people.
 */

/**
 * The reader's list of chats.
 *
 * @param page - The page.
 * @returns The list.
 */
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
 * A message the server has committed, by what it says. One still sending has
 * no ID, and no actions.
 *
 * @param log - The log.
 * @param text - What it says.
 * @returns The message.
 */
const messageIn = (log: Locator, text: string): Locator =>
  log.locator('li[id^="chat-message-"]').filter({ hasText: text });

/**
 * Presses a button from the keyboard: a message's actions are clipped until
 * one has focus, and an icon-only button has no size here, where the icon kit
 * is not configured.
 *
 * @param page - The page.
 * @param button - The button.
 */
async function press(page: Page, button: Locator): Promise<void> {
  await button.focus();
  await page.keyboard.press('Enter');
}

/**
 * Opens a channel from the list of chats.
 *
 * @param page - The page.
 * @param scopeName - Its Community, Fleet or Armada.
 * @param channel - Its name.
 * @returns Its log.
 */
async function openChannel(
  page: Page,
  scopeName: string,
  channel: string,
): Promise<Locator> {
  await page.goto('/chat');
  await scopeIn(page, scopeName)
    .getByRole('link', { name: `# ${channel}` })
    .click();

  const log = logOf(page, `# ${channel}`);

  await expect(log).toBeVisible();

  return log;
}

/**
 * Sends a message, and waits for the server to commit it.
 *
 * @param page - The page.
 * @param place - The open place's title.
 * @param text - What it says.
 */
async function post(page: Page, place: string, text: string): Promise<void> {
  await page.getByLabel(`Message ${place}`).fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(messageIn(logOf(page, place), text)).toBeVisible();
}

/**
 * Sets one of the person's chat settings, and saves it if it changed.
 *
 * @param page - The page.
 * @param name - The switch's name.
 * @param on - Whether it should be on.
 */
async function setChatSetting(
  page: Page,
  name: 'Appear offline' | 'Show when I am typing',
  on: boolean,
): Promise<void> {
  await page.goto('/dashboard/settings');

  const toggle = page.getByRole('switch', { name, exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });

  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute('aria-checked')) !== String(on)) {
    await toggle.click();
    await save.click();
  }

  await expect(toggle).toHaveAttribute('aria-checked', String(on));
  await expect(save).toBeDisabled();
}

/**
 * Opens a page that shows who is online, and waits for the server's answer.
 *
 * @param page - The page.
 * @param path - Where.
 */
async function readPresence(page: Page, path: string): Promise<void> {
  const answered = page.waitForResponse(response =>
    response.url().includes('/chat/presence'),
  );

  await page.goto(path);
  await answered;
}

/**
 * Where a friend's presence shows (FC-034): chat's direct messages, the
 * friends list and their profile, each with the friend there and the mark
 * they wear while online.
 *
 * @param page - The page.
 * @param name - The friend's username.
 * @returns Each place's path, the friend there, and the mark.
 */
function presenceOf(page: Page, name: string): [string, Locator, Locator][] {
  const chat = chatsOf(page).getByRole('link', { name });
  const card = page.locator('app-member-card').filter({ hasText: name });
  const profile = page.getByRole('heading', { level: 1, name });

  return [
    ['/chat', chat, chat.getByText('(online)', { exact: true })],
    ['/community/friends', card, card.getByText('Online', { exact: true })],
    [
      `/community/registry/profiles/${name}`,
      profile,
      profile.getByText('Online', { exact: true }),
    ],
  ];
}

/**
 * Whether nothing on the page is wider than the window.
 *
 * @param page - The page.
 * @param what - What it shows, for the failure message.
 */
async function noSidewaysScroll(page: Page, what: string): Promise<void> {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

  expect(fits, `${what} scrolls sideways`).toBe(true);
}

/**
 * Waits until the outbox has decided every direct message notice it holds
 * for somebody, then counts what they were sent. Asked of the backend rather
 * than a page of theirs, since a page would hold chat's socket and make them
 * present.
 *
 * @param email - Whose.
 * @returns How many "sent you a message" notices they have.
 */
async function settledNotices(email: string): Promise<{ notices: number }> {
  let counts = { notices: 0, pending: 1 };

  // The outbox runs once a minute; each question takes the backend a while.
  await expect(async () => {
    counts = backendSupport<{ notices: number; pending: number }>(
      'fleet-dm-notices',
      email,
    );
    expect(counts.pending, 'notices the outbox has still to decide').toBe(0);
  }).toPass({ timeout: 300_000, intervals: [5_000] });

  return counts;
}

// An Owner may hold ten Communities, closed ones included; each file starts
// with none of the run's, so desktop and phone together stay inside that.
test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test.describe.serial('Chat, as its people use it', () => {
  let communityName: string;
  let fleetName: string;
  let dmPath: string;
  let dmFirst: string;
  let offlineBaseline: number;

  test('the Owner registers a Community and a Fleet, and accepts the applicant', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const applicant = await as('applicant');
    const { people } = fleetPeople();

    communityName = named(info, 'Chat Community');
    fleetName = named(info, 'Chat Fleet');

    await owner.goto('/fleets/register');
    await owner.getByLabel('Name', { exact: true }).fill(communityName);
    await owner.getByLabel('How people join').selectOption({
      label: 'By application',
    });
    await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await owner.getByRole('button', { name: 'Register' }).click();
    await expect(owner).toHaveURL(/\/fleets\/communities\/[^/]+$/);

    await owner
      .getByRole('link', { name: `Register a Fleet into ${communityName}` })
      .click();
    await owner.getByLabel('Name, exactly as in game').fill(fleetName);
    await owner.getByLabel('Platform').selectOption({ label: 'Windows' });
    await owner.getByLabel('Allegiance').selectOption({ label: 'Federation' });
    await owner.getByLabel('How people join').selectOption({
      label: 'By application',
    });
    await owner.getByLabel('Who can see it').selectOption({ label: 'Anyone' });
    await owner
      .getByRole('button', { name: 'Check for existing records' })
      .click();
    await owner.getByRole('button', { name: 'Register' }).click();
    await expect(owner).toHaveURL(/\/fleets\/windows\/[^/]+$/);

    const fleetPath = new URL(owner.url()).pathname;

    await owner.goto(`${fleetPath}/recruitment/settings`);
    await owner.getByLabel('Recruitment', { exact: true }).selectOption({
      label: 'Applications: somebody here decides each one',
    });
    await owner.getByRole('button', { name: 'Save' }).click();
    await expect(
      owner
        .getByText('Saved.', { exact: true })
        .or(owner.getByText('Nothing has changed to save.', { exact: true })),
    ).toBeVisible();

    await applicant.goto(fleetPath);
    await applicant.getByRole('link', { name: 'Apply to join' }).click();
    await applicant.getByLabel('Your Character').selectOption({
      label: `${people.applicant.characterName}@${people.applicant.accountHandle}`,
    });
    await applicant
      .getByRole('button', { name: 'Send the application' })
      .click();
    await expect(
      applicant.getByText(/Your application is sent\./),
    ).toBeVisible();

    await owner.goto(`${fleetPath}/recruitment/applications`);
    await owner
      .getByRole('link', { name: people.applicant.characterName })
      .first()
      .click();
    await owner.getByRole('radio', { name: 'Accept' }).check();
    await owner.getByRole('button', { name: 'Record the decision' }).click();
    await expect(owner.getByText('The decision is recorded.')).toBeVisible();
  });

  test('chat lists the Community and the Fleet, each with its General channel', async ({
    as,
  }) => {
    const owner = await as('owner');

    await owner.goto('/chat');

    for (const name of [communityName, fleetName]) {
      await expect(
        scopeIn(owner, name).getByRole('link', { name: '# General' }),
      ).toBeVisible();
    }
  });

  test('the Owner adds three channels, is refused a fourth, renames one and archives one', async ({
    as,
  }) => {
    const owner = await as('owner');
    const dialog = owner.getByRole('dialog');

    // The fourth is one too many.
    for (const [name, readers, posters] of [
      ['Officers deck', 'Officers and up', 'Officers and up'],
      ['Notices', 'Members', 'Officers and up'],
      ['Mess hall', 'Members', 'Members'],
      ['Overflow', 'Members', 'Members'],
    ]) {
      await owner.goto('/chat');
      await scopeIn(owner, fleetName)
        .getByRole('button', { name: 'Add channel' })
        .click();
      await dialog.getByLabel('Name', { exact: true }).fill(name);
      await dialog.getByLabel('Who reads it').selectOption({ label: readers });
      await dialog
        .getByLabel('Who posts in it')
        .selectOption({ label: posters });
      await dialog.getByRole('button', { name: 'Add channel' }).click();
      await expect(
        name === 'Overflow'
          ? owner.getByText(
              'This has three custom channels already. Archive one to make another.',
            )
          : owner.getByRole('region', { name: `# ${name}` }),
      ).toBeVisible();
    }

    await owner.goto('/chat');
    await press(
      owner,
      scopeIn(owner, fleetName).getByRole('button', {
        name: 'Change Mess hall',
      }),
    );
    await dialog.getByLabel('Name', { exact: true }).fill('Wardroom');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(
      owner.getByRole('region', { name: '# Wardroom' }),
    ).toBeVisible();

    await owner.goto('/chat');

    const fleet = scopeIn(owner, fleetName);

    await press(owner, fleet.getByRole('button', { name: 'Archive Wardroom' }));
    await owner
      .getByRole('dialog')
      .getByRole('button', { name: 'Archive' })
      .click();
    await expect(fleet.getByRole('link', { name: '# Wardroom' })).toHaveCount(
      0,
    );
    await expect(fleet.getByRole('link', { name: '# Notices' })).toBeVisible();
  });

  test('a member does not see an Officers’ channel, and cannot post where only Officers may', async ({
    as,
  }) => {
    const member = await as('applicant');

    await member.goto('/chat');

    const fleet = scopeIn(member, fleetName);

    await expect(fleet.getByRole('link', { name: '# General' })).toBeVisible();
    await expect(
      fleet.getByRole('link', { name: '# Officers deck' }),
    ).toHaveCount(0);

    await fleet.getByRole('link', { name: '# Notices' }).click();
    await expect(
      member.getByText('You can read this channel, but not post in it.'),
    ).toBeVisible();
    await expect(member.getByLabel('Message # Notices')).toHaveCount(0);
  });

  test('the Owner mentions the member, replies and deletes their own message; the member is told once of each', async ({
    as,
  }, info) => {
    test.setTimeout(300_000);

    const member = await as('applicant');
    // Somewhere else on the site, for the toast and the notices.
    const away = await as('applicant');
    const owner = await as('owner');
    const { people } = fleetPeople();
    const hail = named(info, 'hail');
    const note = named(info, 'mention');
    const answer = named(info, 'reply');
    const oops = named(info, 'oops');

    await away.goto('/notifications');
    await openChannel(member, fleetName, 'General');
    await post(member, '# General', hail);

    const log = await openChannel(owner, fleetName, 'General');

    await expect(messageIn(log, hail)).toBeVisible();

    const composer = owner.getByLabel('Message # General');

    await composer.fill(`${note} @${people.applicant.username}`);
    await owner
      .getByRole('listbox', { name: 'People to mention' })
      .getByRole('option', { name: people.applicant.username })
      .click();
    await owner.getByRole('button', { name: 'Send' }).click();
    await expect(
      messageIn(log, note).getByText(`@${people.applicant.username}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      away.locator('app-chat-toasts').getByRole('link', {
        name: `${people.owner.username} mentioned you in # General`,
      }),
    ).toBeVisible();

    await press(
      owner,
      messageIn(log, hail).getByRole('button', {
        name: `Reply to ${people.applicant.username}`,
      }),
    );
    await expect(owner.getByText('Replying to')).toBeVisible();
    await post(owner, '# General', answer);
    await expect(messageIn(log, answer)).toContainText(
      `${people.applicant.username}:`,
    );

    await post(owner, '# General', oops);

    const doomed = await messageIn(log, oops).getAttribute('id');

    await press(
      owner,
      messageIn(log, oops).getByRole('button', { name: 'Delete your message' }),
    );
    await owner
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(owner.locator(`#${doomed}`)).toContainText('Message deleted');

    // The notification outbox runs once a minute.
    const titles = away.locator('.notification-title');

    await expect(async () => {
      await away.goto('/notifications');
      await expect(
        titles
          .filter({
            hasText: `${people.owner.username} mentioned you in General`,
          })
          .filter({ hasText: fleetName }),
      ).toHaveCount(1, { timeout: 5_000 });
      await expect(
        titles
          .filter({
            hasText: `${people.owner.username} replied to you in General`,
          })
          .filter({ hasText: fleetName }),
      ).toHaveCount(1, { timeout: 5_000 });
    }).toPass({ timeout: 180_000, intervals: [10_000] });
  });

  test('a friend’s profile opens a direct message, which toasts elsewhere and arrives live', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const friend = await as('friend');
    const { people } = fleetPeople();
    const dmLive = named(info, 'live');

    dmFirst = named(info, 'direct');

    await friend.goto('/community/friends');
    await owner.goto(`/community/registry/profiles/${people.friend.username}`);
    await owner.getByRole('button', { name: 'Message', exact: true }).click();
    await expect(owner).toHaveURL(/\/chat\/direct\/[^/]+$/);
    dmPath = new URL(owner.url()).pathname;

    await post(owner, people.friend.username, dmFirst);
    await friend
      .locator('app-chat-toasts')
      .getByRole('link', {
        name: `${people.owner.username} sent you a message`,
      })
      .click();
    await expect(friend).toHaveURL(dmPath);

    const log = logOf(friend, people.owner.username);

    await expect(messageIn(log, dmFirst)).toBeVisible();

    await post(owner, people.friend.username, dmLive);
    // Live, over the socket, without reloading.
    await expect(messageIn(log, dmLive)).toBeVisible();
  });

  test('the friend reads the conversation, and leaves no page open', async ({
    as,
  }) => {
    const friend = await as('friend');
    const { people } = fleetPeople();

    // Reading it is what lets its next message tell them again.
    await friend.goto(dmPath);
    await expect(
      messageIn(logOf(friend, people.owner.username), dmFirst),
    ).toBeVisible();
  });

  test('with no page of theirs open, the friend is told once of new messages', async ({
    as,
  }, info) => {
    test.setTimeout(480_000);

    const owner = await as('owner');
    const { people } = fleetPeople();

    offlineBaseline = (await settledNotices(people.friend.email)).notices;

    await owner.goto(dmPath);
    await post(owner, people.friend.username, named(info, 'away one'));
    await post(owner, people.friend.username, named(info, 'away two'));

    expect((await settledNotices(people.friend.email)).notices).toBe(
      offlineBaseline + 1,
    );
  });

  test('the friend reads the conversation again, and leaves', async ({
    as,
  }) => {
    const friend = await as('friend');
    const { people } = fleetPeople();

    await friend.goto(dmPath);
    await expect(
      messageIn(logOf(friend, people.owner.username), dmFirst),
    ).toBeVisible();
  });

  test('once they have read it, the next message tells them again', async ({
    as,
  }, info) => {
    test.setTimeout(480_000);

    const owner = await as('owner');
    const { people } = fleetPeople();

    await owner.goto(dmPath);
    await post(owner, people.friend.username, named(info, 'away three'));

    expect((await settledNotices(people.friend.email)).notices).toBe(
      offlineBaseline + 2,
    );
  });

  test('friends see each other online, until one appears offline', async ({
    as,
  }) => {
    const { people } = fleetPeople();
    // Each kept online by a page left open, since the pages that look are
    // opened again and again.
    const ownerHere = await as('owner');
    const friendHere = await as('friend');
    const ownerLooks = await as('owner');
    const friendLooks = await as('friend');

    await ownerHere.goto('/chat');
    await friendHere.goto('/chat');

    for (const [page, other] of [
      [ownerLooks, people.friend.username],
      [friendLooks, people.owner.username],
    ] as const) {
      for (const [path, , online] of presenceOf(page, other)) {
        // Until the other's socket has said they are here.
        await expect(async () => {
          await readPresence(page, path);
          await expect(online).toHaveCount(1, { timeout: 2_000 });
        }).toPass({ timeout: 90_000 });
      }
    }

    await setChatSetting(ownerLooks, 'Appear offline', true);

    for (const [path, subject, online] of presenceOf(
      friendLooks,
      people.owner.username,
    )) {
      await expect(async () => {
        await readPresence(friendLooks, path);
        await expect(subject).toBeVisible();
        await expect(online).toHaveCount(0, { timeout: 1_000 });
      }).toPass({ timeout: 30_000 });
    }

    await setChatSetting(ownerLooks, 'Appear offline', false);
  });

  test('typing shows only while both people share it', async ({ as }, info) => {
    test.setTimeout(240_000);

    const owner = await as('owner');
    const friend = await as('friend');
    const { people } = fleetPeople();
    const ownerLog = logOf(owner, people.friend.username);
    const composer = friend.getByLabel(`Message ${people.owner.username}`);

    /**
     * Sets who shares their typing, then opens the conversation on each side
     * and waits for both to have joined it.
     */
    const meet = async (ownerShares: boolean, friendShares: boolean) => {
      await setChatSetting(owner, 'Show when I am typing', ownerShares);
      await setChatSetting(friend, 'Show when I am typing', friendShares);
      await owner.goto(dmPath);
      await friend.goto(dmPath);
      await expect(messageIn(ownerLog, dmFirst)).toBeVisible();
      await expect(
        messageIn(logOf(friend, people.owner.username), dmFirst),
      ).toBeVisible();
    };

    await meet(true, true);
    await composer.pressSequentially('Typing', { delay: 50 });
    await expect(
      owner.getByText(`${people.friend.username} is writing…`, {
        exact: true,
      }),
    ).toBeVisible();
    await friend.getByRole('button', { name: 'Send' }).click();

    // Either one not sharing: the Owner, who would see it, then the friend,
    // who would send it.
    for (const [ownerShares, friendShares] of [
      [false, true],
      [true, false],
    ]) {
      const text = named(info, `typed ${ownerShares ? 'friend' : 'owner'} off`);

      await meet(ownerShares, friendShares);
      // Everything the Owner's typing line says, however briefly: it clears
      // as soon as the message it announced arrives.
      await owner.locator('.chat-conversation__typing').evaluate(line => {
        const seen: string[] = [];

        (window as unknown as { typingSeen: string[] }).typingSeen = seen;
        new MutationObserver(() => {
          if (line.textContent?.trim()) {
            seen.push(line.textContent.trim());
          }
        }).observe(line, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
      await composer.pressSequentially(text, { delay: 30 });
      await friend.getByRole('button', { name: 'Send' }).click();
      await expect(messageIn(ownerLog, text)).toBeVisible();
      expect(
        await owner.evaluate(
          () => (window as unknown as { typingSeen: string[] }).typingSeen,
        ),
      ).toEqual([]);
    }

    // Back as each began: off.
    await setChatSetting(owner, 'Show when I am typing', false);
  });

  test('a message is reported once only, and a site admin sees its evidence oldest first and removes it live', async ({
    as,
  }, info) => {
    const member = await as('applicant');
    const owner = await as('owner');
    const admin = await as('admin');
    const { people } = fleetPeople();
    const reported = ['first', 'second', 'third'].map(each =>
      named(info, `evidence ${each}`),
    );
    const note = named(info, 'report');

    await openChannel(member, fleetName, 'General');

    for (const text of reported) {
      await post(member, '# General', text);
    }

    const log = await openChannel(owner, fleetName, 'General');
    const message = messageIn(log, reported[2]);
    const removed = await message.getAttribute('id');

    for (const outcome of [
      'Thanks, a site admin will look at it.',
      'You have already reported this message.',
    ]) {
      await press(
        owner,
        message.getByRole('button', {
          name: `Report the message from ${people.applicant.username}`,
        }),
      );

      const report = owner.getByRole('dialog');

      await report
        .getByLabel('Reason')
        .selectOption({ label: 'Spam or scams' });
      await report.getByLabel('What is wrong').fill(note);
      await report.getByRole('button', { name: 'Send report' }).click();
      await expect(owner.getByText(outcome)).toBeVisible();
      await owner.getByRole('button', { name: 'OK' }).click();
    }

    await admin.goto('/admin/chat-reports');
    await admin.getByLabel('Status').selectOption({ label: 'Open' });

    const entry = admin.getByRole('article').filter({ hasText: note }).first();

    await press(admin, entry.getByRole('button', { name: 'Show evidence' }));
    // allTextContents does not wait for the evidence to draw.
    await expect(entry.getByText(reported[0], { exact: true })).toBeVisible();

    const bodies = (
      await entry.locator('.chat-report-evidence__body').allTextContents()
    ).map(body => body.trim());

    expect(bodies.slice(-3)).toEqual(reported);
    await expect(
      entry.locator('.chat-report-evidence__message').last(),
    ).toContainText('Reported');

    await press(
      admin,
      entry.getByRole('button', { name: 'Remove the message' }),
    );

    const removal = admin.getByRole('dialog');

    await removal.getByLabel('Why').fill('FC-044 journey: a test removal.');
    await removal.getByRole('button', { name: 'Remove' }).click();
    await expect(
      admin.getByText(
        'The message was removed. Its evidence is kept as it was.',
      ),
    ).toBeVisible();
    // Live, over the socket, without reloading.
    await expect(owner.locator(`#${removed}`)).toContainText(
      'Message removed by a moderator',
    );
  });

  test('a block hides the blocked member’s messages without a reload', async ({
    as,
  }, info) => {
    const owner = await as('owner');
    const ownerElsewhere = await as('owner');
    const member = await as('applicant');
    const { people } = fleetPeople();
    const before = named(info, 'before the block');
    const after = named(info, 'after the block');

    await openChannel(member, fleetName, 'General');
    await post(member, '# General', before);

    const log = await openChannel(owner, fleetName, 'General');

    await expect(messageIn(log, before)).toBeVisible();

    await ownerElsewhere.goto(
      `/community/registry/profiles/${people.applicant.username}`,
    );
    await ownerElsewhere
      .getByRole('button', { name: 'Block', exact: true })
      .click();
    await ownerElsewhere
      .getByRole('dialog')
      .getByRole('button', { name: 'Block' })
      .click();
    await expect(
      ownerElsewhere.getByText(`${people.applicant.username} was blocked.`),
    ).toBeVisible();

    try {
      await post(member, '# General', after);
      await expect(
        log
          .getByText('Message from a member you can’t see', { exact: true })
          .last(),
      ).toBeVisible();
      await expect(log.getByText(after)).toHaveCount(0);
    } finally {
      // Lifted again, so a retry and the phone's run start unblocked.
      await ownerElsewhere.goto('/community/friends?tab=blocked');
      await ownerElsewhere
        .getByRole('listitem')
        .filter({ hasText: people.applicant.username })
        .getByRole('button', { name: 'Unblock' })
        .click();
      await ownerElsewhere
        .getByRole('dialog')
        .getByRole('button', { name: 'Unblock' })
        .click();
      await expect(
        ownerElsewhere.getByText(`${people.applicant.username} was unblocked.`),
      ).toBeVisible();
    }
  });

  test('chat fits its screen, and on a narrow one the list and an open chat stack, with a way back', async ({
    as,
  }, info) => {
    const owner = await as('owner');

    await owner.goto('/chat');
    await expect(chatsOf(owner)).toBeVisible();
    await noSidewaysScroll(owner, 'The list of chats');
    await openChannel(owner, fleetName, 'General');
    await noSidewaysScroll(owner, 'The Fleet’s General channel');

    // The phone is narrow already; the desktop is narrowed to a small phone.
    if (!info.project.name.includes('mobile')) {
      await owner.setViewportSize({ width: 375, height: 812 });
    }

    const chats = chatsOf(owner);

    await owner.goto('/chat');
    await expect(chats).toBeVisible();
    await expect(
      owner.getByText('Choose a channel or a conversation.'),
    ).toBeHidden();
    await noSidewaysScroll(owner, 'The narrow list of chats');

    await scopeIn(owner, fleetName)
      .getByRole('link', { name: '# General' })
      .click();
    await expect(
      owner.getByRole('region', { name: '# General' }),
    ).toBeVisible();
    await expect(chats).toBeHidden();
    await noSidewaysScroll(owner, 'The narrow General channel');

    await owner.getByRole('button', { name: 'All chats' }).click();
    await expect(owner).toHaveURL('/chat');
    await expect(chats).toBeVisible();
  });
});
