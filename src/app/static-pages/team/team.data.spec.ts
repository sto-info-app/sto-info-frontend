import { SUPPORTERS, TEAM_MEMBERS } from './team.data';

describe('team.data', () => {
  it('should define team members and supporters', () => {
    expect(Array.isArray(TEAM_MEMBERS)).toBe(true);
    expect(Array.isArray(SUPPORTERS)).toBe(true);
  });

  it('should define team members', () => {
    expect(TEAM_MEMBERS.length).toBeGreaterThan(0);
    const steve = TEAM_MEMBERS.find(m => m.slug === 'steve-roberts');
    expect(steve).toBeDefined();
    expect(steve?.group).toBe('developers');
    expect(steve?.status).toBe('current');
  });

  it('should define supporters array', () => {
    expect(Array.isArray(SUPPORTERS)).toBe(true);
  });
});
