import { backend } from '../support/backend';
import { member } from '../support/member';
import { expect, test } from '../support/fixtures';

/**
 * Journey 9 — deleting, and then really deleting.
 *
 * Two separate promises. Deleting hides something at once and completely, from
 * its owner as well as everybody else; the records behind it are removed for
 * good 180 days later. This walks both, with the clock moved rather than
 * waited out.
 */

const SECTION = 'Temporary notes';
const TAB = 'Scratch';
const FIELD = 'A passing thought';

test('deleting hides at once and the sweep removes for good', async ({
  tracking,
}) => {
  await tracking.openReady();

  await test.step('something worth deleting, with an answer against it', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);
    await tracking.addField(TAB, FIELD, { type: 'TEXT_SINGLE_LINE' });

    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');

    const [account] = await tracking.targetLabels();

    await tracking.chooseTarget(account);
    await tracking.values
      .getByLabel(FIELD, { exact: true })
      .fill('Nothing important');
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('delete the section, answers and all', async () => {
    await tracking.show('What you track');
    await tracking.remove(SECTION);

    await expect(tracking.panelToggle(SECTION)).toHaveCount(0);
  });

  await test.step("it is gone from the owner's own view immediately", async () => {
    await tracking.show('What you have recorded');
    await expect(
      tracking.values.getByLabel(FIELD, { exact: true }),
    ).toHaveCount(0);
  });

  let answersBefore = 0;

  await test.step('the records are still there, waiting out their window', async () => {
    const counts = backend.counts(member.email);

    expect(counts.deleted['custom_tracking_section']).toBeGreaterThan(0);
    expect(counts.deleted['custom_tracking_tab']).toBeGreaterThan(0);
    expect(counts.deleted['custom_tracking_field']).toBeGreaterThan(0);

    // The answer is not stamped as deleted itself. What makes it unreadable is
    // that the field it answered is gone, and it is removed with that field
    // when the window is up — so it is still a live row here, and that is
    // correct rather than an oversight.
    answersBefore = counts.live['custom_tracking_value'];
    expect(answersBefore).toBeGreaterThan(0);
  });

  await test.step('a sweep before the window is up takes nothing', async () => {
    backend.runCleanup();

    expect(
      backend.counts(member.email).deleted['custom_tracking_section'],
    ).toBeGreaterThan(0);
  });

  await test.step('181 days later, the sweep removes them for good', async () => {
    backend.age(member.email, 181);
    backend.runCleanup();

    const counts = backend.counts(member.email);

    expect(counts.deleted).toEqual({
      custom_tracking_section: 0,
      custom_tracking_tab: 0,
      custom_tracking_field: 0,
      custom_tracking_option: 0,
      custom_tracking_value: 0,
    });

    // And the answer went with its field, rather than being left behind as a
    // row nothing can reach.
    expect(counts.live['custom_tracking_value']).toBeLessThan(answersBefore);
  });
});
