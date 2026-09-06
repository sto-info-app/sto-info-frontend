import { resolve } from 'node:path';

import { expect, test } from '../support/fixtures';

/**
 * Journey 4 — a picture for each shape, replaced and then removed.
 *
 * Pictures are the one answer that is not saved with the record. One arrives
 * as bytes and is checked as bytes, so it lands when it is uploaded and the
 * record save neither adds one nor takes one away — which is exactly why it
 * needs walking separately from every other kind of answer.
 *
 * This journey is the only one that reaches services outside the machine it
 * runs on: the file is scanned by a third party and stored in Cloudflare
 * Images, both against whatever account the local configuration points at. So
 * it is opt-in. Run it with E2E_IMAGES=on when you mean to spend that.
 */

const SECTION = 'Ship gallery';
const TAB = 'Pictures';
const PICTURE = resolve('e2e/fixtures/picture.png');

const SHAPES = [
  { shape: 'SQUARE', field: 'Crew badge' },
  { shape: 'LANDSCAPE', field: 'Bridge view' },
  { shape: 'PORTRAIT', field: 'Captain portrait' },
] as const;

test.skip(
  process.env['E2E_IMAGES'] !== 'on',
  'Uploads reach Cloudflare Images and the virus scanner. Set E2E_IMAGES=on to run it.',
);

test('a picture in each shape, replaced and removed', async ({
  page,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('an image field for each shape', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);

    for (const { shape, field } of SHAPES) {
      await tracking.addField(TAB, field, {
        type: 'IMAGE',
        settings: { 'Crop shape': shape },
      });
    }
  });

  await tracking.show('What you have recorded');
  await tracking.chooseScope(tracking.values, 'Accounts');

  const [account] = await tracking.targetLabels();

  await tracking.chooseTarget(account);

  const upload = async (fieldName: string, description: string) => {
    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Choose a picture').setInputFiles(PICTURE);
    await dialog.getByLabel('What does this picture show?').fill(description);

    const uploadButton = dialog.getByRole('button', { name: 'Upload' });

    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();
    await expect(dialog).toBeHidden();
    await expect(
      tracking.values
        .getByRole('group', { name: fieldName })
        .getByAltText(description),
    ).toBeVisible();
  };

  for (const { field } of SHAPES) {
    await test.step(`a picture for ${field}`, async () => {
      await tracking.values
        .getByRole('group', { name: field })
        .getByRole('button', { name: 'Add picture' })
        .click();
      await upload(field, `A test picture for ${field}`);
    });
  }

  const first = SHAPES[0].field;

  await test.step('replacing one leaves the others alone', async () => {
    await tracking.values
      .getByRole('group', { name: first })
      .getByRole('button', { name: 'Replace picture' })
      .click();
    await upload(first, 'A replacement picture');

    await expect(
      tracking.values
        .getByRole('group', { name: SHAPES[1].field })
        .getByAltText(`A test picture for ${SHAPES[1].field}`),
    ).toBeVisible();
  });

  await test.step('and removing one is asked about first', async () => {
    await tracking.values
      .getByRole('group', { name: first })
      .getByRole('button', { name: 'Remove picture' })
      .click();

    const confirmation = page.getByRole('dialog');

    await expect(confirmation).toContainText('Remove the picture answering');
    await confirmation.getByRole('button', { name: 'Remove' }).click();
    await expect(confirmation).toBeHidden();

    await expect(
      tracking.values.getByRole('group', { name: first }),
    ).toContainText('No picture yet');
  });

  await test.step('and the other pictures are untouched by it', async () => {
    for (const { field } of SHAPES.slice(1)) {
      await expect(
        tracking.values
          .getByRole('group', { name: field })
          .getByAltText(`A test picture for ${field}`),
      ).toBeVisible();
    }
  });
});
