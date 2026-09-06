import { anonymously } from '../support/anonymous';
import { member, publicAccountPath } from '../support/member';
import { openPublishedSection } from '../support/public-page';
import { expect, test } from '../support/fixtures';

/**
 * Journey 3 — the visibility chain, walked from the outside.
 *
 * Every gate is checked by a visitor who is not signed in, because that is the
 * only reader whose answer matters. The owner's own view is not evidence: it
 * shows everything by definition.
 *
 * Four gates are exercised here — field, tab, section and the STO account
 * itself. The fifth, the member's profile, is the gate the whole registry
 * hangs on rather than one this feature owns; journeys 10 and 11 come at it
 * from the other side, by disabling the account and by asking for private
 * combinations directly.
 */

const SECTION = 'Ship registry';
const TAB = 'Registry fleet';
const FIELD = 'Flagship';
const ANSWER = 'USS Adamant';

test('nothing is published until every gate above it is open', async ({
  browser,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('build it, entirely private, and record an answer', async () => {
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'TEXT_SINGLE_LINE',
    });
    await tracking.recordAnswer(member.publicAccount, FIELD, ANSWER);
  });

  const expectPublished = async (isPublished: boolean): Promise<void> => {
    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await expect(page.getByText(SECTION, { exact: true })).toHaveCount(
        isPublished ? 1 : 0,
      );
    });
  };

  await tracking.show('What you track');

  await test.step('private throughout: a visitor sees nothing of it', async () => {
    await expectPublished(false);
  });

  await test.step('the field alone is not enough', async () => {
    await tracking.expand(SECTION);
    await tracking.expand(TAB);
    await tracking.setPublic('field', FIELD, true);
    await expectPublished(false);
  });

  await test.step('the field and the tab are not enough', async () => {
    await tracking.setPublic('tab', TAB, true);
    await expectPublished(false);
  });

  await test.step('with the section open as well, it is published', async () => {
    await tracking.setPublic('section', SECTION, true);

    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await openPublishedSection(page, SECTION);
      await expect(page.getByText(ANSWER)).toBeVisible();
    });
  });

  await test.step('an account that is not itself public publishes none of it', async () => {
    await anonymously(browser, async page => {
      const response = await page.goto(
        publicAccountPath(member.privateAccount),
      );

      expect(response?.ok() ?? false).toBe(true);
      await expect(page.getByText(ANSWER)).toHaveCount(0);
    });
  });

  await test.step('closing the section again takes it back down', async () => {
    await tracking.setPublic('section', SECTION, false);
    await expectPublished(false);
  });
});
