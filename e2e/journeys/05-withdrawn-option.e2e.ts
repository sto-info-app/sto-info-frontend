import { expect, test } from '../support/fixtures';

/**
 * Journey 5 — withdrawing a choice somebody has already made.
 *
 * A choice cannot simply be deleted: the answers that chose it would lose the
 * only thing that makes them readable. Withdrawing takes it out of circulation
 * and leaves it legible, which is what this walks.
 */

const SECTION = 'Ship choices';
const TAB = 'Preferences';
const FIELD = 'Favourite ship';

test('a withdrawn choice still reads, and cannot be chosen again', async ({
  tracking,
}) => {
  await tracking.openReady();

  await test.step('a dropdown offering two ships', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);
    await tracking.addField(TAB, FIELD, { type: 'DROPDOWN' });

    await tracking.editField(FIELD);
    await tracking.addOption('choice', 'Defiant');
    await tracking.addOption('choice', 'Voyager');
  });

  const chooser = tracking.values.getByLabel(FIELD, { exact: true });

  await test.step('choose the Defiant and save it', async () => {
    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');

    const [account] = await tracking.targetLabels();

    await tracking.chooseTarget(account);
    await chooser.selectOption({ label: 'Defiant' });
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('withdraw it', async () => {
    await tracking.show('What you track');
    await tracking.expand(SECTION);
    await tracking.expand(TAB);
    await tracking.editField(FIELD);
    await tracking.withdrawOption('Defiant');
  });

  await test.step('the answer already given still says Defiant', async () => {
    await tracking.show('What you have recorded');

    await expect(chooser).toHaveValue(/.+/);
    await expect(chooser.locator('option:checked')).toContainText(
      'Defiant (withdrawn)',
    );
  });

  await test.step('and it cannot be chosen by anybody else', async () => {
    await expect(
      chooser.locator('option', { hasText: 'Defiant (withdrawn)' }),
    ).toBeDisabled();

    await chooser.selectOption({ label: 'Voyager' });
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });
});
