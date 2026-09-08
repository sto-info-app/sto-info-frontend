import { expect, test } from '../support/fixtures';

/**
 * Journey 6 — dates around a daylight-saving change.
 *
 * Two moments an hour either side of the United Kingdom's autumn change, and a
 * calendar date that is not a moment at all. The first two are stored as
 * instants, so the timezone recorded with them is what says which instant was
 * meant; the third has no timezone to be wrong about, and must come back
 * exactly as it was typed no matter where the reader is.
 *
 * The whole page is reloaded between writing and reading. An assertion made
 * without one only proves the form still holds what was typed into it.
 */

const SECTION = 'Fleet diary';
const TAB = 'Dates';
const BEFORE = 'Before the clocks change';
const AFTER = 'After the clocks change';
const CALENDAR = 'Anniversary';

const ZONE = 'Europe/London';

// 25 October 2026: British Summer Time ends at 02:00, when clocks go back.
const BEFORE_THE_CHANGE = '2026-10-25T00:30';
const AFTER_THE_CHANGE = '2026-10-25T03:30';
const THE_DAY = '2026-10-25';

test('moments either side of a clock change survive the round trip', async ({
  tracking,
}) => {
  await tracking.openReady();

  await test.step('two moments and a date', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);
    await tracking.addField(TAB, BEFORE, { type: 'DATE_TIME' });
    await tracking.addField(TAB, AFTER, { type: 'DATE_TIME' });
    await tracking.addField(TAB, CALENDAR, { type: 'DATE' });
  });

  await tracking.show('What you have recorded');
  await tracking.chooseScope(tracking.values, 'Accounts');

  const [account] = await tracking.targetLabels();

  await tracking.chooseTarget(account);

  const moment = (name: string) => tracking.values.getByRole('group', { name });

  await test.step('record them in London time', async () => {
    for (const [name, value] of [
      [BEFORE, BEFORE_THE_CHANGE],
      [AFTER, AFTER_THE_CHANGE],
    ] as const) {
      await moment(name).getByLabel('Date and time').fill(value);
      await moment(name).getByLabel('Timezone').selectOption(ZONE);
    }

    await tracking.values.getByLabel(CALENDAR, { exact: true }).fill(THE_DAY);
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('and read them back after a full reload', async () => {
    await tracking.openReady();
    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    await tracking.chooseTarget(account);

    await expect(moment(BEFORE).getByLabel('Date and time')).toHaveValue(
      BEFORE_THE_CHANGE,
    );
    await expect(moment(BEFORE).getByLabel('Timezone')).toHaveValue(ZONE);

    await expect(moment(AFTER).getByLabel('Date and time')).toHaveValue(
      AFTER_THE_CHANGE,
    );
    await expect(moment(AFTER).getByLabel('Timezone')).toHaveValue(ZONE);

    await expect(
      tracking.values.getByLabel(CALENDAR, { exact: true }),
    ).toHaveValue(THE_DAY);
  });
});
