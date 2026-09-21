import { ROOT_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/** The directory's own address, and the root every scope hangs below. */
const FLEETS = '/' + ROOT_ROUTES.FLEETS;

/**
 * Router links to the canonical address of each kind of scope.
 *
 * Built here rather than written out at each call site. A router link is an
 * array of segments and a canonical Fleet address has six of them, so a
 * hand-written copy is a quiet way to produce a link that resolves to the
 * wrong page — or, worse, to a Fleet of the same name under a different
 * Community.
 *
 * Each segment is passed whole. Angular encodes them, so a slug is handed over
 * as it was read rather than being escaped here and escaped again on the way
 * out.
 */
export const FLEET_LINKS = {
  /**
   * The Fleet listing, which is the directory's landing page.
   *
   * @returns The router link.
   */
  fleetDirectory: (): string[] => [FLEETS],

  /**
   * The Community listing.
   *
   * @returns The router link.
   */
  communityDirectory: (): string[] => [FLEETS, 'communities'],

  /**
   * The Armada listing.
   *
   * @returns The router link.
   */
  armadaDirectory: (): string[] => [FLEETS, 'armadas'],

  /**
   * One Community's page.
   *
   * @param communitySlug - The Community's URL segment.
   * @returns The router link.
   */
  community: (communitySlug: string): string[] => [
    FLEETS,
    'communities',
    communitySlug,
  ],

  /**
   * One Fleet's page, below the Community that registered it.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @returns The router link.
   */
  fleet: (
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
  ): string[] => [
    FLEETS,
    'communities',
    communitySlug,
    'fleets',
    platformSegment,
    fleetSlug,
  ],

  /**
   * One Armada's page, below the Community that registered it.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param armadaSlug - The Armada's URL segment.
   * @returns The router link.
   */
  armada: (
    communitySlug: string,
    platformSegment: string,
    armadaSlug: string,
  ): string[] => [
    FLEETS,
    'communities',
    communitySlug,
    'armadas',
    platformSegment,
    armadaSlug,
  ],
};
