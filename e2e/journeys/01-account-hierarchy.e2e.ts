import { expect, test } from '../support/fixtures';

/**
 * Journey 1 — accept the terms, build a hierarchy for accounts, and record a
 * different answer against two of them.
 *
 * The point of the last part is independence. One definition, many records: if
 * the two accounts ever shared a value, everything else in the feature would be
 * wrong, and it would be wrong quietly.
 */

const SECTION = 'Fleet holdings';
const TAB = 'Progress';
const FIELD = 'Marks banked';

test('accepting the terms, building for accounts, and two records that do not share', async ({
  page,
  tracking,
}) => {
  await tracking.goto();

  await test.step('the agreement is asked for before anything can be built', async () => {
    await expect(
      page.getByRole('heading', { name: /content rules|agreement/i }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'What you track' })).toHaveCount(
      0,
    );

    await tracking.acceptAgreement();
  });

  await test.step('build a section, a tab and a field for accounts', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION, {
      description: 'What each of my accounts has put away.',
    });
    await tracking.addTab(SECTION, TAB);
    await tracking.addField(TAB, FIELD, { type: 'INTEGER' });
  });

  await tracking.show('What you have recorded');
  await tracking.chooseScope(tracking.values, 'Accounts');

  const targets = await tracking.targetLabels();

  expect(
    targets.length,
    'this journey needs a member with at least two STO accounts',
  ).toBeGreaterThan(1);

  const answer = tracking.values.getByLabel(FIELD, { exact: true });

  await test.step('record 120 against the first account', async () => {
    await tracking.chooseTarget(targets[0]);
    await answer.fill('120');
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('the second account starts empty and keeps its own answer', async () => {
    await tracking.chooseTarget(targets[1]);
    await expect(answer).toHaveValue('');

    await answer.fill('45');
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('the first account still reads 120', async () => {
    await tracking.chooseTarget(targets[0]);
    await expect(answer).toHaveValue('120');
  });
});
