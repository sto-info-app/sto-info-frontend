import { ROOT_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/** The directory's own address, and the root every scope hangs below. */
const FLEETS = '/' + ROOT_ROUTES.FLEETS;

/**
 * The segment standing where a Community's slug would, for a Fleet that has
 * none.
 *
 * A standalone Fleet is a record of a Fleet nobody here runs, and it needs
 * an address for the same reason every other record does: so it can be
 * linked to, and so the person about to confirm a second one is shown the
 * first. It has no Community to name, so the position names its absence.
 *
 * Reserved against Community slugs by the server, which is what lets one
 * word mean exactly one thing in that position.
 */
export const FLEET_STANDALONE_SEGMENT = 'standalone';

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
   * The page a roster export is checked on and imported from.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @returns The router link.
   */
  fleetRosterImportForm: (
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
  ): string[] => [
    ...FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug),
    'import',
  ],

  /**
   * A Fleet's roster imports, newest first.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @returns The router link.
   */
  fleetRosterImports: (
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
  ): string[] => [
    ...FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug),
    'imports',
  ],

  /**
   * The renames a Fleet's rosters suggest, for its investigators to decide.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @returns The router link.
   */
  fleetRosterIdentities: (
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
  ): string[] => [
    ...FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug),
    'identities',
  ],

  /**
   * One of a Fleet's roster imports, and where it has got to.
   *
   * @param communitySlug - The holding Community's URL segment.
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @param importId - The import.
   * @returns The router link.
   */
  fleetRosterImport: (
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
    importId: string,
  ): string[] => [
    ...FLEET_LINKS.fleetRosterImports(
      communitySlug,
      platformSegment,
      fleetSlug,
    ),
    importId,
  ],

  /**
   * One Fleet's page, where no Community registered it.
   *
   * The same shape as a registered Fleet's, with the reserved segment where
   * the Community's slug would be. One shape rather than two, so a link to
   * a Fleet is built the same way wherever it comes from.
   *
   * @param platformSegment - The platform, as a URL segment.
   * @param fleetSlug - The Fleet's URL segment.
   * @returns The router link.
   */
  standaloneFleet: (platformSegment: string, fleetSlug: string): string[] => [
    FLEETS,
    'communities',
    FLEET_STANDALONE_SEGMENT,
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
