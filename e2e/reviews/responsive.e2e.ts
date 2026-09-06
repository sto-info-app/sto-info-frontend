import { Page } from '@playwright/test';

import { anonymously } from '../support/anonymous';
import { member, publicAccountPath } from '../support/member';
import { openPublishedSection } from '../support/public-page';
import { expect, test } from '../support/fixtures';

/**
 * The responsive review.
 *
 * The question left open when the builder was written was whether a large
 * permitted configuration stays usable on a small screen — a fair worry, since
 * the builder nests three levels of panel and hangs five controls off each
 * bar. This answers it by building the widest thing a member is likely to
 * have, at the longest names the limits allow, and checking on a phone-sized
 * screen that the page never scrolls sideways and that the controls are still
 * reachable.
 *
 * Sideways scrolling is the check because it is the failure that cannot be
 * worked around: a reader can scroll down, and can zoom, but a control pushed
 * off the right edge of a page that does not scroll that way is simply gone.
 */

const SECTION = 'A section with a deliberately long name for testing';
const TAB = 'A tab whose name is also longer than anybody would really use';
const FIELDS = [
  { name: 'Single line of text with a long name', type: 'TEXT_SINGLE_LINE' },
  { name: 'A number', type: 'INTEGER' },
  { name: 'A date somebody chose', type: 'DATE' },
  { name: 'A moment, with a timezone beside it', type: 'DATE_TIME' },
  { name: 'A range of dates', type: 'DATE_RANGE' },
  { name: 'How far along something is', type: 'PROGRESS' },
  { name: 'One of several choices', type: 'DROPDOWN' },
  { name: 'A colour', type: 'COLOUR' },
];

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

/**
 * Whether the page can be scrolled sideways.
 *
 * A pixel of tolerance, because a sub-pixel layout rounding is not a fault
 * anybody can see or reach.
 */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
}

test('a wide configuration stays usable on a phone', async ({
  browser,
  page,
  tracking,
}) => {
  await page.setViewportSize(DESKTOP);
  await tracking.openReady();

  await test.step('build something deliberately awkward', async () => {
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.addSection(SECTION);
    await tracking.addTab(SECTION, TAB);

    for (const field of FIELDS) {
      await tracking.addField(TAB, field.name, { type: field.type });
    }
  });

  await test.step('the builder does not scroll sideways on a phone', async () => {
    await page.setViewportSize(PHONE);
    await tracking.goto();
    await tracking.chooseScope(tracking.definitions, 'Accounts');
    await tracking.expand(SECTION);
    await tracking.expand(TAB);

    expect(await scrollsSideways(page)).toBe(false);
  });

  await test.step('and every control on a panel bar is still reachable', async () => {
    for (const name of [`Edit ${SECTION}`, `Delete ${SECTION}`]) {
      const control = page.getByRole('button', { name });

      await expect(control).toBeVisible();
      await expect(control).toBeInViewport();
    }
  });

  await test.step('nor does the recording panel, with every kind of control on it', async () => {
    await tracking.show('What you have recorded');
    await tracking.chooseScope(tracking.values, 'Accounts');
    await tracking.chooseTarget(member.publicAccount);

    for (const field of FIELDS) {
      await expect(tracking.values.getByText(field.name).first()).toBeVisible();
    }

    // An answer, so that there is something for the published view to show.
    // A published field with nothing recorded against it publishes nothing.
    await tracking.values
      .getByLabel(FIELDS[0].name, { exact: true })
      .fill('Something to read on a small screen');
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();

    expect(await scrollsSideways(page)).toBe(false);
  });

  await test.step('and neither does it on a desktop', async () => {
    await page.setViewportSize(DESKTOP);

    expect(await scrollsSideways(page)).toBe(false);
  });

  // The same configuration seen by a visitor, in the same test rather than a
  // second one: building it takes a minute, and a test that leaned on another
  // test's leftovers is what this suite has already learned not to write.
  await test.step('and the published view fits a phone as well', async () => {
    await tracking.show('What you track');
    await tracking.expand(SECTION);
    await tracking.setPublic('section', SECTION, true);
    await tracking.expand(TAB);
    await tracking.setPublic('tab', TAB, true);

    for (const field of FIELDS) {
      await tracking.setPublic('field', field.name, true);
    }

    await anonymously(browser, async visitor => {
      await visitor.setViewportSize(PHONE);
      await visitor.goto(publicAccountPath(member.publicAccount));
      await openPublishedSection(visitor, SECTION);

      expect(await scrollsSideways(visitor)).toBe(false);
    });
  });
});
