import { anonymously } from '../support/anonymous';
import { backend } from '../support/backend';
import { member, publicAccountPath } from '../support/member';
import { expect, test } from '../support/fixtures';

/**
 * Journey 10 — disabling an account takes everything down at once.
 *
 * This is the answer to somebody publishing what they should not have. It has
 * to work on the whole of what they published, in one act, without an
 * administrator going through their sections one at a time — and it has to be
 * reversible, because the same is true of a mistake.
 *
 * The account is re-enabled at the end. Later journeys sign in as this member.
 */

const SECTION = 'Published notes';
const TAB = 'Open';
const FIELD = 'Motto';
const ANSWER = 'Ex Astris, Scientia';

test('disabling the account withdraws everything it published', async ({
  browser,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('publish something', async () => {
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'TEXT_SINGLE_LINE',
      publiclyVisible: true,
    });
    await tracking.recordAnswer(member.publicAccount, FIELD, ANSWER);
  });

  await test.step('a visitor can read it', async () => {
    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await expect(page.getByText(SECTION, { exact: true })).toBeVisible();
    });
  });

  await test.step('the account is disabled, and it is all gone', async () => {
    backend.setDisabled(member.email, 'on');

    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await expect(page.getByText(SECTION, { exact: true })).toHaveCount(0);
      await expect(page.getByText(ANSWER)).toHaveCount(0);
    });
  });

  await test.step('enabling it again puts it back', async () => {
    backend.setDisabled(member.email, 'off');

    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await expect(page.getByText(SECTION, { exact: true })).toBeVisible();
    });
  });
});
