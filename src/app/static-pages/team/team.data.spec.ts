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

  it('should define supporters array', () => {
    expect(Array.isArray(SUPPORTERS)).toBe(true);
  });
});
