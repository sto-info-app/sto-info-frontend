import { expect, test } from '../support/fixtures';

/**
 * Journey 2 — a hierarchy for characters, with a required field.
 *
 * "Required" is a statement about a record, not about a control. Turning it on
 * must block the record being filled in and no other: a captain whose record
 * was complete yesterday does not become unsaveable because a sibling has a
 * gap.
 */

const SECTION = 'Captain log';
const TAB = 'Service';
const REQUIRED_FIELD = 'Current assignment';
const OPTIONAL_FIELD = 'Missions run';

test('a required answer blocks only the record that is missing it', async ({
  tracking,
  page,
}) => {
  await tracking.openReady();

  await test.step('build for characters', async () => {
    await tracking.chooseScope(tracking.definitions, 'Characters');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);
    await tracking.addField(TAB, REQUIRED_FIELD, {
      type: 'TEXT_SINGLE_LINE',
      required: true,
    });
    await tracking.addField(TAB, OPTIONAL_FIELD, { type: 'INTEGER' });
  });

  await tracking.show('What you have recorded');
  await tracking.chooseScope(tracking.values, 'Characters');

  const captains = await tracking.targetLabels();

  expect(
    captains.length,
    'this journey needs a member with at least two captains',
  ).toBeGreaterThan(1);

  const assignment = tracking.values.getByLabel(REQUIRED_FIELD, {
    exact: true,
  });
  const missions = tracking.values.getByLabel(OPTIONAL_FIELD, { exact: true });
  const stillNeeded = page.getByRole('alert');

  await test.step('the first captain cannot be saved with it empty', async () => {
    await tracking.chooseTarget(captains[0]);
    await missions.fill('7');
    await tracking.saveRecord();

    await expect(stillNeeded).toContainText(REQUIRED_FIELD);
    await expect(tracking.savedConfirmation).toBeHidden();
  });

  await test.step('answering it lets the record through', async () => {
    await assignment.fill('USS Adamant');
    await tracking.saveRecord();

    await expect(tracking.savedConfirmation).toBeVisible();
    await expect(stillNeeded).toHaveCount(0);
  });

  await test.step('the second captain is blocked on its own account', async () => {
    await tracking.chooseTarget(captains[1]);
    await expect(assignment).toHaveValue('');

    await tracking.saveRecord();
    await expect(stillNeeded).toContainText(REQUIRED_FIELD);
  });

  await test.step('and the first captain is still saved', async () => {
    await tracking.chooseTarget(captains[0]);
    await expect(assignment).toHaveValue('USS Adamant');
    await expect(missions).toHaveValue('7');
  });
});
