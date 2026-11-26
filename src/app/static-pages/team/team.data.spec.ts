import { TeamGroup } from './models/team-group.model';
import { TeamStatus } from './models/team-status.model';
import { SUPPORTERS, TEAM_MEMBERS } from './team.data';

const developersGroup: TeamGroup = 'developers';
const currentStatus: TeamStatus = 'current';

describe('team.data', () => {
  it('should define team members and supporters', () => {
    expect(Array.isArray(TEAM_MEMBERS)).toBe(true);
    expect(Array.isArray(SUPPORTERS)).toBe(true);
  });

  it('should define team members', () => {
    expect(TEAM_MEMBERS.length).toBeGreaterThan(0);
    const steve = TEAM_MEMBERS.find(m => m.slug === 'steve-roberts');
    expect(steve).toBeDefined();
    expect(steve?.group).toBe(developersGroup);
    expect(steve?.status).toBe(currentStatus);
  });

  it.each([
    ['winters', 'Winters', 'Fleet Community Beta Tester.'],
    ['dragonwwolfe', 'DragonWWolfe', 'General Beta Tester.'],
    ['bazag', 'Bazag', 'STO Storytime Beta Tester.'],
    ['tharryn-lachman', 'Tharryn Lachman', 'STO Storytime Beta Tester.'],
  ])(
    'should credit %s as a current volunteer Beta Tester',
    (slug, name, highlight) => {
      const tester = TEAM_MEMBERS.find(m => m.slug === slug);

      expect(tester).toEqual(
        expect.objectContaining({
          name,
          title: 'Beta Tester',
          group: 'volunteers',
          status: currentStatus,
        }),
      );
      expect(tester?.highlights).toEqual([highlight]);
    },
  );

  it('should keep every slug unique within its group', () => {
    const keys = TEAM_MEMBERS.map(m => `${m.group}/${m.slug}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should define supporters array', () => {
    expect(Array.isArray(SUPPORTERS)).toBe(true);
  });
});
