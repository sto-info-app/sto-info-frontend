import { expect } from '@playwright/test';

import { fleetBackend, fleetTest as test } from '../support/fleet-people';
import {
  caption,
  choose,
  click,
  glide,
  openClip,
  pause,
  readNotices,
  typeInto,
} from './support/clip';
import {
  placeInArmada,
  registerArmada,
  registerCommunity,
  registerFleet,
} from './support/prepare';

/**
 * The Fleets section's "Armadas" guide, as a video (13 October 2026): a
 * Fleet asking to join, the request approved as a Gamma, the Gamma moved up
 * to a Beta, the Alpha leaving, and the Armada's History.
 *
 * Off camera the Owner registers the Community, an Armada already holding
 * an Alpha and a Beta, and a third Fleet. The Owner records.
 */

const COMMUNITY = 'Starfleet Reserve';
const ALPHA = 'Reserve Fleet Alpha';
const BETA = 'Reserve Fleet Beta';
const GAMMA = 'Reserve Fleet Gamma';
const ARMADA = 'Reserve Armada';

test.beforeAll(() => {
  fleetBackend.clearCommunities();
});

test('Armadas', async ({ as, browser }, info) => {
  const owner = await as('owner');
  const communityPath = await registerCommunity(owner, COMMUNITY);
  const alphaPath = await registerFleet(owner, communityPath, COMMUNITY, ALPHA);
  const betaPath = await registerFleet(owner, communityPath, COMMUNITY, BETA);
  const gammaPath = await registerFleet(owner, communityPath, COMMUNITY, GAMMA);
  const armadaPath = await registerArmada(
    owner,
    communityPath,
    COMMUNITY,
    ARMADA,
  );

  await placeInArmada(owner, alphaPath, ALPHA, armadaPath, ARMADA, 'Alpha');
  await placeInArmada(owner, betaPath, BETA, armadaPath, ARMADA, 'Beta');
  await readNotices(owner);

  const clip = await openClip(browser, info, 'owner');
  const { page } = clip;

  // Kept even when a step fails, so what went wrong can be watched.
  try {
    // The shape.
    await page.goto(armadaPath);
    clip.start();
    await page.mouse.move(960, 600, { steps: 10 });
    await caption(
      page,
      'An Armada: one Alpha, up to three Betas, and up to three Gammas under each Beta',
    );
    await glide(page, page.getByText('Fleets in this Armada').first());
    await pause(page, 4_000);
    await caption(
      page,
      'It is kept by hand. No roster export says anything about Armadas',
    );
    await pause(page, 3_000);

    // Asking to join.
    await page.goto(gammaPath);
    await caption(
      page,
      'On the Fleet’s page, under Armada: choose the Armada and Ask to join',
    );

    const ask = page.getByRole('form', { name: 'Ask to join an Armada' });

    await choose(page, ask.getByLabel('Armada', { exact: true }), ARMADA);
    await typeInto(
      page,
      ask.getByLabel('Message (optional)'),
      'We run with the Alpha most evenings.',
    );
    await click(page, ask.getByRole('button', { name: 'Ask to join' }));
    await expect(
      page.getByText('Your request is on its way to the Armada’s managers.'),
    ).toBeVisible();
    await caption(
      page,
      'Only Armadas the Fleet could join are offered: same Community, platform and allegiance',
    );
    await pause(page, 4_000);

    // Approving, as a Gamma.
    await page.goto(`${armadaPath}/requests`);
    await caption(
      page,
      'The Armada’s Requests tab: Approve… asks for a Position, from those with room',
    );
    await click(
      page,
      page
        .getByRole('row')
        .filter({ hasText: GAMMA })
        .getByRole('button', { name: 'Approve…' }),
    );

    const approve = page.getByRole('form', { name: `Approve ${GAMMA}` });

    await choose(page, approve.getByLabel('Position'), 'Gamma');
    // The Betas are offered with how many Gammas each holds, so by place.
    await glide(page, approve.getByLabel('Under'));
    await approve.getByLabel('Under').selectOption({ index: 1 });
    await pause(page, 1_000);
    await click(
      page,
      approve.getByRole('button', { name: 'Approve', exact: true }),
    );
    await expect(
      page.getByText(`${GAMMA} joined the Armada.`, { exact: true }),
    ).toBeVisible();
    await caption(
      page,
      'Whoever asked is told of an approval, a rejection with its reason, or a lapse',
    );
    await pause(page, 3_500);

    // Moving.
    await page.goto(armadaPath);
    await caption(
      page,
      'Move… and Remove… sit on each Fleet. Every change needs a reason, kept with it',
    );
    await click(
      page,
      page.getByRole('button', { name: `Move ${GAMMA}`, exact: true }),
    );

    const move = page.getByRole('form', { name: `Move ${GAMMA}` });

    await choose(page, move.getByLabel('To', { exact: true }), 'Beta');
    await typeInto(
      page,
      move.getByLabel('Reason', { exact: true }),
      'Grown enough to stand as a Beta.',
    );
    await click(page, move.getByRole('button', { name: 'Move', exact: true }));
    await expect(
      page.getByText(`${GAMMA} moved.`, { exact: true }),
    ).toBeVisible();
    await pause(page, 3_500);

    // The Alpha leaving.
    await page.goto(alphaPath);
    await caption(
      page,
      'Leave the Armada…, on the Fleet’s own page. The Alpha can leave without the Betas',
    );
    await click(page, page.getByRole('button', { name: 'Leave the Armada…' }));

    const leave = page.getByRole('form', { name: 'Leave the Armada' });

    await typeInto(
      page,
      leave.getByLabel('Reason'),
      'Standing down as the Alpha for a while.',
    );
    await click(page, leave.getByRole('button', { name: 'Leave…' }));
    await pause(page, 1_500);
    await click(
      page,
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Leave', exact: true }),
    );
    await pause(page, 3_000);
    await page.goto(armadaPath);
    await caption(
      page,
      'The Alpha slot shows as Empty until another Fleet is placed there',
    );
    await glide(page, page.getByText('Empty', { exact: true }).first());
    await pause(page, 3_500);

    // The history.
    await page.goto(`${armadaPath}/history`);
    await caption(
      page,
      'History lists every placement, move and departure, newest first',
    );
    await pause(page, 4_000);
    await caption(
      page,
      'While a Fleet sits in an Armada, its members are members of the Armada too',
    );
    await pause(page, 3_500);
    await caption(page, '');
    await pause(page, 1_500);
  } finally {
    console.log(`Recorded ${await clip.finish('fleets-07-armadas')}`);
  }
});
