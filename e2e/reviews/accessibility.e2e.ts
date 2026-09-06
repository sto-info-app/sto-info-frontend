import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { anonymously } from '../support/anonymous';
import { backend } from '../support/backend';
import { member, publicAccountPath } from '../support/member';
import { openPublishedSection } from '../support/public-page';
import { expect, test } from '../support/fixtures';

/**
 * The accessibility review, run rather than written down.
 *
 * axe finds the mechanical faults — contrast, missing names, broken label
 * associations, headings that skip a level. It cannot tell whether a control
 * makes sense, which is why the journeys themselves reach for everything by
 * role and accessible name: between them, a control that cannot be described
 * fails one, and a control that is described wrongly fails the other.
 *
 * The scans are scoped to the feature's own markup. The site's frame is
 * elaborate and shared by every page; whatever it does well or badly, it is
 * not this feature's to answer for, and including it would mean this review
 * reporting the same site-wide findings on every run for ever.
 *
 * Each scan is the last thing done to a page. A scan injects axe into the
 * document and walks the whole tree, and driving that page afterwards turned
 * out not to be reliable — so the hierarchy is built first, and every scan
 * after that starts from a fresh load.
 */

const SECTION = 'Accessible section';
const TAB = 'Accessible tab';
const FIELD = 'Accessible field';

const FEATURE = '#custom-tracking-settings';
const PUBLISHED = '.custom-tracking-display';

// The scans walk a large tree several times over, which is slower than
// anything else the harness does.
test.describe.configure({ timeout: 600_000 });

const noViolations = async (page: Page, within: string): Promise<void> => {
  const { violations } = await new AxeBuilder({ page })
    .include(within)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    violations.map(violation => `${violation.id}: ${violation.help}`),
  ).toEqual([]);
};

test('every Custom Tracking screen is mechanically accessible', async ({
  browser,
  page,
  tracking,
}) => {
  await test.step('build something worth scanning', async () => {
    await tracking.openReady();
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'DROPDOWN',
      publiclyVisible: true,
    });

    await tracking.editField(FIELD);
    await tracking.addOption('choice', 'A choice');

    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    await tracking.chooseTarget(member.publicAccount);
    await tracking.values
      .getByLabel(FIELD, { exact: true })
      .selectOption({ label: 'A choice' });
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('the builder, with a hierarchy and an editor open', async () => {
    await tracking.openReady();
    await tracking.expand(SECTION);
    await tracking.expand(TAB);
    await tracking.editField(FIELD);

    await noViolations(page, FEATURE);
  });

  await test.step('the recording panel', async () => {
    await tracking.openReady();
    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    await tracking.chooseTarget(member.publicAccount);

    await noViolations(page, FEATURE);
  });

  await test.step('the rules, which are mostly prose', async () => {
    await tracking.openReady();
    await tracking.show('About and the rules');

    await noViolations(page, FEATURE);
  });

  await test.step('and the published view a visitor gets', async () => {
    await anonymously(browser, async visitor => {
      await visitor.goto(publicAccountPath(member.publicAccount));
      await openPublishedSection(visitor, SECTION);

      await noViolations(visitor, PUBLISHED);
    });
  });
});

test('the agreement, which is the first thing anybody sees, is accessible', async ({
  page,
  tracking,
}) => {
  // By the time the reviews run this member has accepted, so the agreement is
  // not on screen. Ageing the acceptance puts it back — as the re-acceptance
  // panel, which is the same component carrying one extra notice, and is the
  // version most people will meet more than once.
  backend.staleAcceptance(member.email);

  await tracking.goto();
  await expect(
    page.getByText(/This agreement has changed since you last accepted it/),
  ).toBeVisible();

  await noViolations(page, FEATURE);

  // Put it back, or every test after this one is locked out of editing.
  await tracking.acceptAgreement();
});

test('a hierarchy can be reordered without a mouse', async ({
  page,
  tracking,
}) => {
  await tracking.openReady();
  await tracking.chooseScope(tracking.definitions, 'Accounts');

  const first = 'Keyboard order one';
  const second = 'Keyboard order two';

  await tracking.addSection(first);
  await tracking.addSection(second);

  // Dragging is an alternative, never the only way. The buttons beside each
  // panel do the same job, and they are reachable by keyboard alone — which is
  // the whole point of them existing.
  const moveUp = page.getByRole('button', { name: `Move ${second} up` });

  await moveUp.focus();
  await expect(moveUp).toBeFocused();
  await page.keyboard.press('Enter');

  // The new order is the server's answer, so this waits for it rather than
  // reading the list the instant the key is released.
  await expect
    .poll(async () => {
      const names = await page
        .locator(
          '.custom-tracking-section-list > li .custom-tracking-panel-name',
        )
        .allTextContents();

      return names.indexOf(second) < names.indexOf(first);
    })
    .toBe(true);
});
