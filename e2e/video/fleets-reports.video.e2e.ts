import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  becomeRole,
  caption,
  choose,
  click,
  glide,
  openClip,
  pause,
  readNotices,
} from './support/clip';
import {
  importRoster,
  registerCommunity,
  registerFleet,
  rosterRow,
} from './support/prepare';

/**
 * The Fleets section's "Fleet reports" guide, as a video (13 October 2026):
 * each of the eight reports in turn, the span, Download CSV, who sees each
 * report changed, and what a visitor shown counts only sees.
 *
 * Off camera the Owner registers the Community and a Fleet, and imports two
 * exports a month apart. The Owner records; the clip signs out to look as a
 * visitor.
 */

const COMMUNITY = 'Starfleet Reserve';
const FLEET = 'Reserve Fleet Alpha';

/** Each report, and a line about it. */
const REPORTS: readonly [string, string][] = [
  [
    'Growth',
    'Growth: between each export and the next, how many joined, rejoined, left or were unknown',
  ],
  [
    'Activity',
    'Activity: each export’s members by how long before it they were last active',
  ],
  [
    'Tenure',
    'Tenure: how long each export’s members had been listed in their current stretch',
  ],
  [
    'Ranks',
    'Ranks: members under each rank, in the Fleet’s rank order, and the changes revealed',
  ],
  [
    'Contribution',
    'Contribution: the total rise between exports, and how many members it rests on',
  ],
  [
    'Attendance',
    'Attendance: for each event occurrence, who was going and who was recorded as coming',
  ],
  [
    'Recruitment',
    'Recruitment: month by month, applications, joins and invitations, and days to a decision',
  ],
  [
    'Holdings',
    'Holdings: every tier a track moved, newest first, never who or why',
  ],
];

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Fleet reports', async ({ as, browser }, info) => {
  test.setTimeout(900_000);

  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const fleetPath = await registerFleet(owner, communityPath, COMMUNITY, FLEET);

  await importRoster(
    owner,
    fleetPath,
    FLEET,
    [
      rosterRow('Aria Venn', 'fixture001'),
      rosterRow('Dax Orlan', 'fixture002', 'Recruit'),
      rosterRow('Kira Tal', 'fixture003'),
    ],
    '20240101-120000',
  );
  await importRoster(
    owner,
    fleetPath,
    FLEET,
    [
      rosterRow('Aria Venn', 'fixture001'),
      rosterRow('Dax Orlan', 'fixture002'),
      rosterRow('Kira Tal', 'fixture003'),
      rosterRow('Sela Vor', 'fixture004', 'Recruit'),
    ],
    '20240201-120000',
  );
  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;
  const reports = page.getByRole('navigation', { name: 'Report' });

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // Each report.
    await page.goto(`${fleetPath}/reports`);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'The Reports tab: five reports built from the roster history, three from what the Fleet does here',
    );
    await pause(page, 3_500);

    for (const [name, line] of REPORTS) {
      await click(page, reports.getByRole('link', { name, exact: true }));
      await caption(page, line);
      await pause(page, 4_000);
    }

    // The span, and the download.
    await click(
      page,
      reports.getByRole('link', { name: 'Growth', exact: true }),
    );
    await caption(
      page,
      'A roster report speaks only for the exports it covers. Choose From and To, then Show',
    );
    await glide(page, page.getByLabel('From').first());
    await pause(page, 2_500);
    await glide(page, page.getByRole('button', { name: 'Download CSV' }));
    await caption(
      page,
      'Download CSV holds the tables as shown, every time in UTC, and a hidden figure as < 5',
    );
    await pause(page, 4_000);

    // Who sees each report.
    const audiences = page.getByRole('region', {
      name: 'Who sees each report',
    });
    const growth = audiences.getByRole('row').filter({ hasText: 'Growth' });

    await glide(page, audiences.getByText('Who sees each report').first());
    await caption(
      page,
      'Only the Owner changes who sees a report: Shown to, then Save. Each change is kept',
    );
    await pause(page, 2_500);
    await choose(page, growth.getByLabel('Shown to'), 'Anyone, counts only');
    await click(
      page,
      growth.getByRole('button', { name: 'Save', exact: true }),
    );
    await pause(page, 3_000);

    // As a visitor.
    await becomeRole(page, null);
    await page.goto(`${fleetPath}/reports`);
    await caption(
      page,
      'A visitor shown counts only: never a name or a handle, and a figure under five reads < 5',
    );
    await expect(
      page.getByText(/You are shown counts and totals only/),
    ).toBeVisible();
    await glide(page, page.getByText('< 5', { exact: true }).first());
    await pause(page, 4_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-16-reports')}`);
  }
});
