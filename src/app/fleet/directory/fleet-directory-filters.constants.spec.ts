import { FleetRecruitmentState } from 'src/app/models/fleet.models';

import {
  FLEET_RECRUITMENT_FILTER_OPTIONS,
  FLEET_ROSTER_OPTIONS,
  FleetRosterFilter,
  recruitmentFilterOf,
  rosterFilterOf,
  rosterQueryOf,
} from './fleet-directory-filters.constants';

describe('fleet directory filter constants', () => {
  describe('recruitment postures', () => {
    // Open to closed, which is the order somebody looking for a Fleet to join
    // cares about them in.
    it('offers all four, open first and closed last', () => {
      expect(FLEET_RECRUITMENT_FILTER_OPTIONS.map(o => o.value)).toEqual([
        FleetRecruitmentState.OPEN,
        FleetRecruitmentState.APPLICATION,
        FleetRecruitmentState.INVITE_ONLY,
        FleetRecruitmentState.CLOSED,
      ]);
    });

    /*
     * A filter is a reader pointing at what the cards say, so picking
     * "Applications open" should return cards reading "Applications open"
     * rather than the form's "By application".
     */
    it('words each choice as the card pill words it', () => {
      expect(FLEET_RECRUITMENT_FILTER_OPTIONS.map(o => o.label)).toEqual([
        'Recruiting',
        'Applications open',
        'Invitation only',
        'Not recruiting',
      ]);
    });

    it('reads a posture it offers', () => {
      expect(recruitmentFilterOf('APPLICATION')).toBe(
        FleetRecruitmentState.APPLICATION,
      );
    });

    it.each([['BANANAS'], [''], [null]])('narrows by nothing for %s', value => {
      expect(recruitmentFilterOf(value)).toBeUndefined();
    });
  });

  describe('the roster window', () => {
    it('offers every choice a query exists for', () => {
      expect(FLEET_ROSTER_OPTIONS.map(o => o.value)).toEqual([
        FleetRosterFilter.ANY,
        FleetRosterFilter.NEVER,
        FleetRosterFilter.EVER,
        FleetRosterFilter.DAYS_30,
        FleetRosterFilter.DAYS_90,
        FleetRosterFilter.DAYS_365,
      ]);
    });

    /*
     * Written as nothing at all, so choosing it drops the parameter rather
     * than writing a question into the URL that asks nothing.
     */
    it('says no narrowing with an empty value', () => {
      expect(FleetRosterFilter.ANY).toBe('');
    });

    it.each([
      [FleetRosterFilter.ANY, {}],
      [FleetRosterFilter.NEVER, { withRoster: false }],
      [FleetRosterFilter.EVER, { withRoster: true }],
      [FleetRosterFilter.DAYS_30, { freshWithinDays: 30 }],
      [FleetRosterFilter.DAYS_90, { freshWithinDays: 90 }],
      [FleetRosterFilter.DAYS_365, { freshWithinDays: 365 }],
    ])('turns %s into what the server takes', (value, expected) => {
      expect(rosterQueryOf(value)).toEqual(expected);
    });

    /*
     * The server treats a freshness window as implying a roster exists, so
     * sending both would be saying the same thing twice in a way that only
     * has a wrong version.
     */
    it('sends no roster flag alongside a window', () => {
      expect(rosterQueryOf(FleetRosterFilter.DAYS_90)).not.toHaveProperty(
        'withRoster',
      );
    });

    it.each([['BANANAS'], [null], ['toString']])(
      'reads %s as no narrowing at all',
      value => {
        expect(rosterFilterOf(value)).toBe(FleetRosterFilter.ANY);
        expect(rosterQueryOf(value)).toEqual({});
      },
    );

    it('reads a choice it offers', () => {
      expect(rosterFilterOf('DAYS_30')).toBe(FleetRosterFilter.DAYS_30);
    });
  });
});
