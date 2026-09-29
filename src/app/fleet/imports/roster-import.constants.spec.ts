import {
  ROSTER_IMPORT_CAPABILITY,
  ROSTER_IMPORT_READERS,
  ROSTER_INVESTIGATE_CAPABILITY,
  ROSTER_INVESTIGATE_READ_CAPABILITY,
  readsOnly,
} from './roster-import.constants';

describe('roster import capabilities', () => {
  it('lets a site admin looking in read a Fleet’s imports (FC-036)', () => {
    expect(ROSTER_IMPORT_READERS).toEqual([
      ROSTER_IMPORT_CAPABILITY,
      ROSTER_INVESTIGATE_CAPABILITY,
      ROSTER_INVESTIGATE_READ_CAPABILITY,
    ]);
  });

  it.each([
    [[ROSTER_INVESTIGATE_READ_CAPABILITY], true],
    [
      [ROSTER_INVESTIGATE_READ_CAPABILITY, ROSTER_INVESTIGATE_CAPABILITY],
      false,
    ],
    [[ROSTER_INVESTIGATE_CAPABILITY], false],
    [[ROSTER_IMPORT_CAPABILITY], false],
  ])('reads %p as read-only: %p', (capabilities, expected) => {
    expect(readsOnly(capabilities)).toBe(expected);
  });
});
