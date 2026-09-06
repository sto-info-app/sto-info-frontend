import { anonymously } from '../support/anonymous';
import { backend } from '../support/backend';
import { member, publicAccountPath } from '../support/member';
import { expect, test } from '../support/fixtures';

/**
 * Journey 8 — the agreement changes underneath somebody.
 *
 * The rule is that a new version locks editing and nothing else. What has
 * already been recorded stays where it is, stays readable, and stays published
 * if it was published: withdrawing somebody's own information because the
 * wording of an agreement moved would be a punishment for something they did
 * not do.
 */

const SECTION = 'Standing orders';
const TAB = 'Current';
const FIELD = 'Posting';
const ANSWER = 'Deep Space Nine';

test('a new version of the agreement locks editing and nothing else', async ({
  browser,
  page,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('record something and publish it', async () => {
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'TEXT_SINGLE_LINE',
      publiclyVisible: true,
    });
    await tracking.recordAnswer(member.publicAccount, FIELD, ANSWER);
  });

  await test.step('the agreement moves on', async () => {
    backend.staleAcceptance(member.email);
    await tracking.goto();

    await expect(
      page.getByText(/This agreement has changed since you last accepted it/),
    ).toBeVisible();
  });

  await test.step('so there is nothing here to edit with', async () => {
    await expect(page.getByRole('tab', { name: 'What you track' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Add a section' }),
    ).toHaveCount(0);
  });

  await test.step('but what was published is still published', async () => {
    await anonymously(browser, async visitor => {
      await visitor.goto(publicAccountPath(member.publicAccount));
      await expect(visitor.getByText(SECTION, { exact: true })).toBeVisible();
    });
  });

  await test.step('accepting the new wording gives the builder back', async () => {
    await tracking.acceptAgreement();

    await expect(
      page.getByRole('tab', { name: 'What you track' }),
    ).toBeVisible();
    await expect(tracking.panelToggle(SECTION)).toBeVisible();
  });
});
