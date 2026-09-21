import {
  FLEET_SCOPE_ARMADA,
  FLEET_SCOPE_COMMUNITY,
  FLEET_SCOPE_FLEET,
} from 'src/app/fleet/constants/fleet-scope.constants';
import {
  FleetCommunityCard,
  FleetRecruitmentState,
  FleetScopeStatus,
  StoArmadaCard,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';

import {
  buildArmadaCardVm,
  buildCommunityCardVm,
  buildFleetCardVm,
} from './fleet-card.builders';

/** Stands in for the reader's timezone, which the page supplies. */
const formatInstant = (value: string): string => `formatted(${value})`;

/**
 * Builds a Community card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function communityCard(
  overrides: Partial<FleetCommunityCard> = {},
): FleetCommunityCard {
  return {
    id: 'community-1',
    slug: 'united-federation-alliance',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    name: 'United Federation Alliance',
    description: 'A home for casual PvE fleets.',
    recruitmentState: FleetRecruitmentState.OPEN,
    ...overrides,
  };
}

/**
 * Builds a Fleet card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function fleetCard(overrides: Partial<StoFleetCard> = {}): StoFleetCard {
  return {
    id: 'fleet-1',
    slug: 'starfleet-command',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    exactGameName: 'Starfleet Command',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    duplicateCount: 0,
    recruitmentState: FleetRecruitmentState.OPEN,
    allegianceFactionId: null,
    lastEffectiveImportAt: null,
    ...overrides,
  };
}

/**
 * Builds an Armada card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function armadaCard(overrides: Partial<StoArmadaCard> = {}): StoArmadaCard {
  return {
    id: 'armada-1',
    slug: 'ninth-fleet-armada',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    exactGameName: 'Ninth Fleet Armada',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    duplicateCount: 0,
    displayName: null,
    ...overrides,
  };
}

describe('fleet-card.builders', () => {
  describe('buildCommunityCardVm', () => {
    it('should describe a Community and link to its page', () => {
      const vm = buildCommunityCardVm(communityCard());

      expect(vm.id).toBe('community-1');
      expect(vm.scope).toBe(FLEET_SCOPE_COMMUNITY);
      expect(vm.name).toBe('United Federation Alliance');
      expect(vm.link).toEqual([
        '/fleets',
        'communities',
        'united-federation-alliance',
      ]);
      expect(vm.unlinkedTitle).toBeNull();
    });

    it('should leave the parent and the platform off', () => {
      const vm = buildCommunityCardVm(communityCard());

      expect(vm.communityName).toBeNull();
      expect(vm.platform).toBeNull();
    });

    it('should carry the description as a secondary line', () => {
      const vm = buildCommunityCardVm(communityCard());

      expect(vm.meta).toEqual(['A home for casual PvE fleets.']);
    });

    it('should carry no secondary line when nothing was written', () => {
      const vm = buildCommunityCardVm(communityCard({ description: null }));

      expect(vm.meta).toEqual([]);
    });

    it('should never claim a Community was observed', () => {
      const vm = buildCommunityCardVm(communityCard());

      expect(vm.lastObservedLabel).toBeNull();
    });
  });

  describe('the emblem', () => {
    it('should resolve the reference to a square image', () => {
      const vm = buildCommunityCardVm(
        communityCard({
          emblemImageId: 'emblem-ref',
          emblemImageAlt: 'A crossed-sabres badge',
        }),
      );

      expect(vm.emblem).toEqual({
        url: `${BASE_CLOUDFLARE_IMAGES_URL}/emblem-ref/square100`,
        alt: 'A crossed-sabres badge',
      });
    });

    it('should draw no emblem where the scope has none', () => {
      expect(buildCommunityCardVm(communityCard()).emblem).toBeNull();
    });

    it('should fall back to an empty description, which is valid markup', () => {
      const vm = buildFleetCardVm(
        fleetCard({ emblemImageId: 'emblem-ref', emblemImageAlt: null }),
        formatInstant,
      );

      expect(vm.emblem?.alt).toBe('');
    });
  });

  describe('the state pill', () => {
    it.each([
      [FleetRecruitmentState.OPEN, 'Recruiting', 'recruiting'],
      [FleetRecruitmentState.APPLICATION, 'Applications open', 'application'],
      [FleetRecruitmentState.INVITE_ONLY, 'Invitation only', 'invite'],
      [FleetRecruitmentState.CLOSED, 'Not recruiting', 'closed'],
    ])(
      'should report %s as "%s" while the record is operating',
      (recruitmentState, label, modifier) => {
        const vm = buildCommunityCardVm(communityCard({ recruitmentState }));

        expect(vm.status).toEqual({ label, modifier });
      },
    );

    it.each([
      [FleetScopeStatus.SUSPENDED, 'Suspended', 'suspended'],
      [FleetScopeStatus.CLOSED, 'Closed', 'closed'],
    ])(
      'should let %s speak over the recruitment posture',
      (status, label, modifier) => {
        const vm = buildCommunityCardVm(
          communityCard({
            status,
            recruitmentState: FleetRecruitmentState.OPEN,
          }),
        );

        expect(vm.status).toEqual({ label, modifier });
      },
    );

    it('should say nothing about an Armada that is operating normally', () => {
      expect(buildArmadaCardVm(armadaCard()).status).toBeNull();
    });
  });

  describe('buildFleetCardVm', () => {
    it('should describe a registered Fleet and link to its canonical address', () => {
      const vm = buildFleetCardVm(fleetCard(), formatInstant);

      expect(vm.scope).toBe(FLEET_SCOPE_FLEET);
      expect(vm.name).toBe('Starfleet Command');
      expect(vm.communityName).toBe('United Federation Alliance');
      expect(vm.platform).toBe('PC');
      expect(vm.link).toEqual([
        '/fleets',
        'communities',
        'united-federation-alliance',
        'fleets',
        'pc',
        'starfleet-command',
      ]);
      expect(vm.unlinkedTitle).toBeNull();
    });

    it('should leave an unregistered Fleet unlinked, and say why', () => {
      const vm = buildFleetCardVm(
        fleetCard({
          communityId: null,
          communityName: null,
          communitySlug: null,
        }),
        formatInstant,
      );

      expect(vm.link).toBeNull();
      expect(vm.unlinkedTitle).toBe(
        'Nobody has registered this Fleet to a Community, so it has no page of its own.',
      );
    });

    it('should write the last roster import out in the reader’s own words', () => {
      const vm = buildFleetCardVm(
        fleetCard({ lastEffectiveImportAt: '2026-03-04T05:06:07.000Z' }),
        formatInstant,
      );

      expect(vm.lastObservedLabel).toBe(
        'Roster last imported formatted(2026-03-04T05:06:07.000Z)',
      );
    });

    it('should say plainly when no roster has ever been imported', () => {
      const vm = buildFleetCardVm(fleetCard(), formatInstant);

      expect(vm.lastObservedLabel).toBe('No roster has ever been imported');
    });

    it('should say nothing about duplicates when the name is unique', () => {
      expect(buildFleetCardVm(fleetCard(), formatInstant).meta).toEqual([]);
    });

    it('should count a single other record in the singular', () => {
      const vm = buildFleetCardVm(
        fleetCard({ duplicateCount: 1 }),
        formatInstant,
      );

      expect(vm.meta).toEqual(['1 other record answers to this name on PC']);
    });

    it('should count several other records in the plural, naming the platform', () => {
      const vm = buildFleetCardVm(
        fleetCard({ duplicateCount: 3, platformName: 'Xbox' }),
        formatInstant,
      );

      expect(vm.meta).toEqual(['3 other records answer to this name on Xbox']);
    });
  });

  describe('buildArmadaCardVm', () => {
    it('should describe an Armada and link to its canonical address', () => {
      const vm = buildArmadaCardVm(armadaCard());

      expect(vm.scope).toBe(FLEET_SCOPE_ARMADA);
      expect(vm.name).toBe('Ninth Fleet Armada');
      expect(vm.link).toEqual([
        '/fleets',
        'communities',
        'united-federation-alliance',
        'armadas',
        'pc',
        'ninth-fleet-armada',
      ]);
      expect(vm.unlinkedTitle).toBeNull();
    });

    it('should never claim an Armada was observed', () => {
      expect(buildArmadaCardVm(armadaCard()).lastObservedLabel).toBeNull();
    });

    it('should show a preferred name beneath the one the game holds', () => {
      const vm = buildArmadaCardVm(armadaCard({ displayName: 'The Ninth' }));

      expect(vm.name).toBe('Ninth Fleet Armada');
      expect(vm.meta).toEqual(['Known as “The Ninth”']);
    });

    it('should not repeat a preferred name that matches the game’s', () => {
      const vm = buildArmadaCardVm(
        armadaCard({ displayName: 'Ninth Fleet Armada' }),
      );

      expect(vm.meta).toEqual([]);
    });

    it('should list a preferred name and a duplicate count together', () => {
      const vm = buildArmadaCardVm(
        armadaCard({ displayName: 'The Ninth', duplicateCount: 2 }),
      );

      expect(vm.meta).toEqual([
        'Known as “The Ninth”',
        '2 other records answer to this name on PC',
      ]);
    });

    it('should leave an Armada unlinked when its Community cannot be read', () => {
      const vm = buildArmadaCardVm(armadaCard({ communitySlug: null }));

      expect(vm.link).toBeNull();
      expect(vm.unlinkedTitle).toBe(
        'This Armada’s Community could not be read, so it cannot be opened.',
      );
    });
  });
});
