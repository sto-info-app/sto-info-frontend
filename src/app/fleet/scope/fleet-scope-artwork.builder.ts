import { FleetScopeViewer } from 'src/app/models/fleet.models';

import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
  FleetArtworkSource,
} from '../fleet-artwork';
import { FLEET_IMAGE_SPECS, FleetImageSlot } from '../fleet-image.constants';
import { FleetArtworkTarget } from '../fleet-image.service';
import {
  FleetScopeArtworkSlotVm,
  FleetScopeArtworkVm,
} from './fleet-scope-page.models';

/**
 * Builds the artwork controls a scope page should offer, if any.
 *
 * Shared by the three pages, because a Community, a Fleet and an Armada
 * carry the same two pictures under the same two rules and differ only in
 * where an upload is addressed.
 *
 * Answers null when the viewer may change neither picture, which is the
 * ordinary case: a page is read far more often than it is edited, and a row
 * of disabled buttons would tell every reader about a permission they do not
 * have and did not ask about.
 *
 * @param target - Where an upload for this record is sent.
 * @param scopeName - The record's name, for the dialogue's heading.
 * @param source - The record's artwork columns.
 * @param viewer - What the caller looking at it may do.
 * @returns The controls, or null when there are none to offer.
 */
export function buildScopeArtworkVm(
  target: FleetArtworkTarget,
  scopeName: string,
  source: FleetArtworkSource,
  viewer: FleetScopeViewer,
): FleetScopeArtworkVm | null {
  const slots: FleetScopeArtworkSlotVm[] = [
    {
      slot: FleetImageSlot.BANNER,
      label: FLEET_IMAGE_SPECS[FleetImageSlot.BANNER].label,
      picture: bannerOf(source),
      mayManage: viewer.mayManageBanner,
    },
    {
      slot: FleetImageSlot.EMBLEM,
      label: FLEET_IMAGE_SPECS[FleetImageSlot.EMBLEM].label,
      // The size the page itself shows it at, so a reader judging what is
      // there is looking at what everybody else is.
      picture: emblemOf(source, FLEET_EMBLEM_SIZES.PAGE),
      mayManage: viewer.mayManageEmblem,
    },
  ];

  if (!slots.some(slot => slot.mayManage)) {
    return null;
  }

  return { target, scopeName, slots };
}
