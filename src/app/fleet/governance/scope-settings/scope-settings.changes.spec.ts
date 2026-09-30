import {
  FleetAudience,
  FleetCommunity,
  FleetRecruitmentState,
  StoFleet,
} from 'src/app/models/fleet.models';

import {
  communityChangesOf,
  communityValuesOf,
  fleetChangesOf,
  fleetValuesOf,
  hasChanges,
} from './scope-settings.changes';

/** A Community as read. */
const community = {
  id: 'community-1',
  name: 'United Federation Alliance',
  slug: 'united-federation-alliance',
  description: 'Fleets flying together.',
  recruitmentState: FleetRecruitmentState.OPEN,
  visibility: FleetAudience.PUBLIC,
  preferredTimezone: 'Europe/London',
  revision: 4,
} as FleetCommunity;

/** A Fleet as read. */
const fleet = {
  id: 'fleet-1',
  exactGameName: ' Ninth Fleet',
  slug: 'ninth-fleet',
  allegianceFactionId: 'faction-federation',
  recruitmentState: FleetRecruitmentState.APPLICATION,
  visibility: FleetAudience.PUBLIC,
  revision: 2,
} as StoFleet;

describe('scope settings changes', () => {
  describe('a Community', () => {
    it('starts the form from the Community as it stands', () => {
      expect(communityValuesOf(community)).toEqual({
        name: 'United Federation Alliance',
        slug: 'united-federation-alliance',
        description: 'Fleets flying together.',
        recruitmentState: FleetRecruitmentState.OPEN,
        visibility: FleetAudience.PUBLIC,
        preferredTimezone: 'Europe/London',
        allegianceFactionId: '',
      });
    });

    it('starts an absent description empty', () => {
      expect(
        communityValuesOf({ ...community, description: null }).description,
      ).toBe('');
    });

    it('finds nothing to send when nothing changed', () => {
      expect(
        hasChanges(communityChangesOf(community, communityValuesOf(community))),
      ).toBe(false);
    });

    it('sends every field that changed, trimmed', () => {
      expect(
        communityChangesOf(community, {
          ...communityValuesOf(community),
          name: '  The Alliance  ',
          slug: ' the-alliance ',
          description: ' Still flying. ',
          recruitmentState: FleetRecruitmentState.CLOSED,
          visibility: FleetAudience.COMMUNITY,
          preferredTimezone: 'America/New_York',
        }),
      ).toEqual({
        name: 'The Alliance',
        slug: 'the-alliance',
        description: 'Still flying.',
        recruitmentState: FleetRecruitmentState.CLOSED,
        visibility: FleetAudience.COMMUNITY,
        preferredTimezone: 'America/New_York',
      });
    });

    // Only spacing changed, which a Community's name does not keep.
    it('treats a name that differs only in edge spaces as unchanged', () => {
      expect(
        communityChangesOf(community, {
          ...communityValuesOf(community),
          name: ' United Federation Alliance ',
        }),
      ).toEqual({});
    });

    it('clears an emptied description with null', () => {
      expect(
        communityChangesOf(community, {
          ...communityValuesOf(community),
          description: '   ',
        }),
      ).toEqual({ description: null });
    });

    it('sends nothing for a description still empty', () => {
      const bare = { ...community, description: null };

      expect(communityChangesOf(bare, communityValuesOf(bare))).toEqual({});
    });

    // A rename with the web address left alone lets the server make a new
    // one from the new name; an emptied field means the same.
    it('sends no web address left as it was or emptied', () => {
      expect(
        communityChangesOf(community, {
          ...communityValuesOf(community),
          name: 'The Alliance',
        }),
      ).toEqual({ name: 'The Alliance' });
      expect(
        communityChangesOf(community, {
          ...communityValuesOf(community),
          slug: '  ',
        }),
      ).toEqual({});
    });
  });

  describe('a Fleet', () => {
    it('starts the form from the Fleet as it stands', () => {
      expect(fleetValuesOf(fleet)).toEqual({
        name: ' Ninth Fleet',
        slug: 'ninth-fleet',
        description: '',
        recruitmentState: FleetRecruitmentState.APPLICATION,
        visibility: FleetAudience.PUBLIC,
        preferredTimezone: '',
        allegianceFactionId: 'faction-federation',
      });
    });

    it('starts an unstated allegiance empty', () => {
      expect(
        fleetValuesOf({ ...fleet, allegianceFactionId: null })
          .allegianceFactionId,
      ).toBe('');
    });

    it('finds nothing to send when nothing changed', () => {
      expect(hasChanges(fleetChangesOf(fleet, fleetValuesOf(fleet)))).toBe(
        false,
      );
    });

    // ADR-0003: an edge space is part of the name, so losing one is a rename.
    it('sends a name that differs only in an edge space, exactly as typed', () => {
      expect(
        fleetChangesOf(fleet, { ...fleetValuesOf(fleet), name: 'Ninth Fleet' }),
      ).toEqual({ exactGameName: 'Ninth Fleet' });
    });

    it('sends every field that changed', () => {
      expect(
        fleetChangesOf(fleet, {
          ...fleetValuesOf(fleet),
          name: 'Tenth Fleet ',
          slug: 'tenth',
          allegianceFactionId: 'faction-klingon',
          visibility: FleetAudience.PRIVATE,
        }),
      ).toEqual({
        exactGameName: 'Tenth Fleet ',
        slug: 'tenth',
        allegianceFactionId: 'faction-klingon',
        visibility: FleetAudience.PRIVATE,
      });
    });

    it('clears an allegiance with null', () => {
      expect(
        fleetChangesOf(fleet, {
          ...fleetValuesOf(fleet),
          allegianceFactionId: '',
        }),
      ).toEqual({ allegianceFactionId: null });
    });
  });
});
