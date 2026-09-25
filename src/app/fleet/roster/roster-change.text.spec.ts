import {
  RosterChange,
  RosterChangeKind,
  RosterRankMove,
} from 'src/app/models/fleet-roster.models';

import {
  describeRosterChange,
  ROSTER_CHANGE_KIND_LABELS,
} from './roster-change.text';

/**
 * Builds a change.
 *
 * @param kind - What changed.
 * @param overrides - Fields to change.
 * @returns The change.
 */
function change(
  kind: RosterChangeKind,
  overrides: Partial<RosterChange> = {},
): RosterChange {
  return {
    identityId: 'identity-1',
    kind,
    from: { importId: 'import-1', exportedAt: '2024-11-01T12:00:00.000Z' },
    to: { importId: 'import-2', exportedAt: '2024-11-15T12:00:00.000Z' },
    acrossGap: false,
    member: null,
    rankMove: null,
    ...overrides,
  };
}

/** Writes a whole number as the page would. */
const whole = (value: string): string => `#${value}`;

/** Writes an instant as the page would. */
const day = (instant: string): string => `day(${instant.slice(0, 10)})`;

describe('describeRosterChange', () => {
  it.each([
    [RosterChangeKind.JOINED, 'joined'],
    [RosterChangeKind.REJOINED, 'rejoined'],
    [RosterChangeKind.LEFT, 'left'],
  ])('says a %s member %s', (kind, phrase) => {
    expect(describeRosterChange(change(kind), whole, day)).toBe(phrase);
  });

  it('names both names and handles of a rename', () => {
    expect(
      describeRosterChange(
        change(RosterChangeKind.RENAMED, {
          fromCharacterName: 'Kess Varro',
          fromAccountHandle: '@fixture030',
          toCharacterName: 'Kess Tarin',
          toAccountHandle: '@fixture030',
        }),
        whole,
        day,
      ),
    ).toBe('was renamed from Kess Varro@fixture030 to Kess Tarin@fixture030');
  });

  // Plan section 3.7: a promotion only where the tiers say so.
  it.each([
    [RosterRankMove.PROMOTED, 'was promoted from Member to Officer'],
    [RosterRankMove.DEMOTED, 'was demoted from Member to Officer'],
    [null, 'changed rank from Member to Officer'],
  ])('calls a rank change %s only as the tiers say', (rankMove, phrase) => {
    expect(
      describeRosterChange(
        change(RosterChangeKind.RANK_CHANGED, {
          fromRank: 'Member',
          toRank: 'Officer',
          rankMove,
        }),
        whole,
        day,
      ),
    ).toBe(phrase);
  });

  it('gives both Join Dates', () => {
    expect(
      describeRosterChange(
        change(RosterChangeKind.JOIN_DATE_CHANGED, {
          fromJoinedAt: '2024-01-01T00:00:00.000Z',
          toJoinedAt: '2024-01-02T00:00:00.000Z',
        }),
        whole,
        day,
      ),
    ).toBe(
      'had their Join Date change from day(2024-01-01) to day(2024-01-02)',
    );
  });

  it('gives a rise and the totals either side', () => {
    expect(
      describeRosterChange(
        change(RosterChangeKind.CONTRIBUTION_CHANGED, {
          contributionDelta: '100',
          fromContribution: '98200',
          toContribution: '98300',
        }),
        whole,
        day,
      ),
    ).toBe('contributed #100 (#98200 to #98300)');
  });

  // A fall is never a negative gift.
  it('calls a fall a reset, with no amount given', () => {
    expect(
      describeRosterChange(
        change(RosterChangeKind.CONTRIBUTION_RESET, {
          contributionDelta: null,
          fromContribution: '120600',
          toContribution: '120500',
        }),
        whole,
        day,
      ),
    ).toBe('had their contribution total reset (#120600 to #120500)');
  });

  it('labels every kind for the filter', () => {
    expect(Object.keys(ROSTER_CHANGE_KIND_LABELS).sort()).toEqual(
      Object.values(RosterChangeKind).sort(),
    );
  });
});
