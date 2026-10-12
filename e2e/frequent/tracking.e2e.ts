import { expect, Page, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug } from '../support/snapshot';

/**
 * TRACK-01. One endeavour node and one reputation tier, checked after a
 * reload, with a different account and captain left as they were.
 *
 * Actors: the demonstration member. The click is reversed afterwards, because
 * the same control toggles.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'TRACK-01 an endeavour node and a reputation tier survive a reload',
  { tag: '@high' },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);
    const targetAccount = accountBySlug(shot, member.publicAccount);
    const otherAccount = accountBySlug(shot, member.privateAccount);
    const targetCaptain = targetAccount.characters[0];
    const otherCaptain = otherAccount.characters[0];

    if (!targetCaptain || !otherCaptain) {
      throw new Error(
        'The demonstration accounts have no captain to record against.',
      );
    }

    let perkLabel: string | null = null;
    let reputationLabel: string | null = null;

    try {
      const otherPerks = await readStat(
        page,
        `/dashboard/accounts/${otherAccount.handle}/endeavours`,
        'Perks Earnt',
      );
      const beforePerks = await readStat(
        page,
        `/dashboard/accounts/${targetAccount.handle}/endeavours`,
        'Perks Earnt',
      );

      perkLabel = await perkControl(page);
      await perkButton(page, perkLabel).click();
      await expect(stat(page, 'Perks Earnt')).not.toHaveText(beforePerks);
      const savedPerks = (await stat(page, 'Perks Earnt').innerText()).trim();

      await page.reload();
      await expect(stat(page, 'Perks Earnt')).toHaveText(savedPerks);
      expect(
        await readStat(
          page,
          `/dashboard/accounts/${otherAccount.handle}/endeavours`,
          'Perks Earnt',
        ),
      ).toBe(otherPerks);

      const otherTiers = await readStat(
        page,
        reputationPath(otherAccount.handle, otherCaptain.handle),
        'Tiers Earnt',
      );
      const beforeTiers = await readStat(
        page,
        reputationPath(targetAccount.handle, targetCaptain.handle),
        'Tiers Earnt',
      );

      reputationLabel = await reputationControl(page);
      await reputationButton(page, reputationLabel).click();
      await expect(stat(page, 'Tiers Earnt')).not.toHaveText(beforeTiers);
      const savedTiers = (await stat(page, 'Tiers Earnt').innerText()).trim();

      await page.reload();
      await expect(stat(page, 'Tiers Earnt')).toHaveText(savedTiers);
      expect(
        await readStat(
          page,
          reputationPath(otherAccount.handle, otherCaptain.handle),
          'Tiers Earnt',
        ),
      ).toBe(otherTiers);
    } finally {
      if (perkLabel) {
        await page.goto(
          `/dashboard/accounts/${targetAccount.handle}/endeavours`,
        );
        await perkButton(page, perkLabel).click();
      }

      if (reputationLabel) {
        await page.goto(
          reputationPath(targetAccount.handle, targetCaptain.handle),
        );
        await reputationButton(page, reputationLabel).click();
      }
    }
  },
);

function reputationPath(account: string, captain: string): string {
  return `/dashboard/accounts/${account}/${captain}?tab=reputations`;
}

/**
 * The first perk row that offers this segment.
 *
 * Space and Ground can share a perk name, so the same accessible name is on
 * more than one button. The discovery walk uses document order, and so does
 * this.
 */
function perkButton(page: Page, label: string) {
  return page
    .locator('.perk-row')
    .filter({
      has: page.getByRole('button', { name: label, exact: true }),
    })
    .first()
    .getByRole('button', { name: label, exact: true });
}

/** The first reputation row that offers this tier. */
function reputationButton(page: Page, label: string) {
  return page
    .locator('.reputation-row')
    .filter({
      has: page.getByRole('button', { name: label, exact: true }),
    })
    .first()
    .getByRole('button', { name: label, exact: true });
}

function stat(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=preceding-sibling::span[1]');
}

async function readStat(
  page: Page,
  path: string,
  label: string,
): Promise<string> {
  await page.goto(path);
  await expect(stat(page, label)).toBeVisible();

  return (await stat(page, label).innerText()).trim();
}

/**
 * The accessible name of the segment that toggles the current node.
 *
 * Clicking it changes the node, and clicking that same name again puts it
 * back: the control treats a click on the current node as one step down, and
 * a click on a higher node as a jump to it.
 */
async function perkControl(page: Page): Promise<string> {
  const label = await page.evaluate(() => {
    const ownText = (element: Element | null): string => {
      if (!element) {
        return '';
      }

      return [...element.childNodes]
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => (child.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ');
    };

    for (const row of document.querySelectorAll('.perk-row')) {
      const status = [...row.querySelectorAll('.sr-only')]
        .map(node => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
        .find(text => /^\d+ of \d+ perks$/.test(text));
      const match = status?.match(/^(\d+) of (\d+) perks$/);

      if (!match) {
        continue;
      }

      const name = ownText(row.querySelector('.perk-name'));

      if (!name) {
        continue;
      }

      const node = match[1] === '0' ? '1' : match[1];

      return `${node} of ${match[2]} perks for ${name}`;
    }

    return null;
  });

  if (!label) {
    throw new Error('No endeavour perk was on the page.');
  }

  return label;
}

/** The accessible name of the tier segment that toggles the current tier. */
async function reputationControl(page: Page): Promise<string> {
  const label = await page.evaluate(() => {
    const ownText = (element: Element | null): string => {
      if (!element) {
        return '';
      }

      return [...element.childNodes]
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => (child.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ');
    };

    for (const row of document.querySelectorAll('.reputation-row')) {
      const status = [...row.querySelectorAll('.sr-only')]
        .map(node => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
        .find(text => /^\d+ of \d+ tiers$/.test(text));
      const match = status?.match(/^(\d+) of (\d+) tiers$/);

      if (!match) {
        continue;
      }

      const name = ownText(row.querySelector('.reputation-name'));
      const node = match[1] === '0' ? '1' : match[1];
      const button = [...row.querySelectorAll('button')].find(candidate => {
        const accessible = candidate.getAttribute('aria-label') ?? '';

        return (
          accessible.startsWith(`Tier ${node} /`) &&
          accessible.endsWith(`for ${name}`)
        );
      });

      return button?.getAttribute('aria-label') ?? null;
    }

    return null;
  });

  if (!label) {
    throw new Error('No reputation was on the page.');
  }

  return label;
}
