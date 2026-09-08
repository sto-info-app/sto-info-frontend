import { anonymously } from '../support/anonymous';
import { member, publicAccountPath } from '../support/member';
import { openPublishedSection } from '../support/public-page';
import { expect, test } from '../support/fixtures';

/**
 * Journey 11 — what a crawler can have, and what it cannot.
 *
 * A crawler is only a visitor without a session, so the interesting half is
 * the API rather than the page: a page can hide something it was nonetheless
 * given. This asks the server directly, in the same request the page makes,
 * and looks through the whole answer for the private field's name — not just
 * its value, because the name of a field somebody defined for themselves is
 * information about them too.
 */

const SECTION = 'Registry entry';
const TAB = 'Details';
const PUBLIC_FIELD = 'Home port';
const PRIVATE_FIELD = 'What I actually think of it';
const PUBLIC_ANSWER = 'Earth Spacedock';
const PRIVATE_ANSWER = 'Overcrowded';

const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:3000';

test('public content is served to anybody, and private content to nobody', async ({
  browser,
  request,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('one field published, one kept back, in the same tab', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION, { publiclyVisible: true });
    await tracking.addTab(SECTION, TAB, { publiclyVisible: true });
    await tracking.addField(TAB, PUBLIC_FIELD, {
      type: 'TEXT_SINGLE_LINE',
      publiclyVisible: true,
    });
    await tracking.addField(TAB, PRIVATE_FIELD, {
      type: 'TEXT_SINGLE_LINE',
    });

    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    await tracking.chooseTarget(member.publicAccount);
    await tracking.values
      .getByLabel(PUBLIC_FIELD, { exact: true })
      .fill(PUBLIC_ANSWER);
    await tracking.values
      .getByLabel(PRIVATE_FIELD, { exact: true })
      .fill(PRIVATE_ANSWER);
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('the page shows one and not the other', async () => {
    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await openPublishedSection(page, SECTION);

      await expect(page.getByText(PUBLIC_ANSWER)).toBeVisible();
      await expect(page.getByText(PRIVATE_FIELD)).toHaveCount(0);
      await expect(page.getByText(PRIVATE_ANSWER)).toHaveCount(0);
    });
  });

  await test.step('and the server never sent the other at all', async () => {
    const response = await request.get(
      `${apiUrl}/registry/profiles/${member.username}/${member.publicAccount}`,
    );

    expect(response.status()).toBe(200);

    const served = await response.text();

    expect(served).toContain(PUBLIC_ANSWER);
    expect(served).not.toContain(PRIVATE_FIELD);
    expect(served).not.toContain(PRIVATE_ANSWER);
  });

  await test.step('an account that is not public offers nothing of either', async () => {
    const response = await request.get(
      `${apiUrl}/registry/profiles/${member.username}/${member.privateAccount}`,
    );
    const served = response.ok() ? await response.text() : '';

    expect(served).not.toContain(PUBLIC_ANSWER);
    expect(served).not.toContain(PRIVATE_ANSWER);
  });
});
