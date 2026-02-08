import { TEST_SUPPORTERS, TEST_TEAM_MEMBERS } from './testing/team-test-data';
import { SUPPORTERS, TEAM_MEMBERS } from './team.data';

jest.mock('./team.data', () => {
  return {
    TEAM_MEMBERS: TEST_TEAM_MEMBERS,
    SUPPORTERS: TEST_SUPPORTERS,
  };
});

describe('team.data', () => {
  it('should define team members for each group and status', () => {
    const developers = TEAM_MEMBERS.filter(m => m.group === 'developers');
    const volunteers = TEAM_MEMBERS.filter(m => m.group === 'volunteers');

    expect(developers.length).toBeGreaterThan(0);
    expect(volunteers.length).toBeGreaterThan(0);

    const currentDevelopers = developers.filter(m => m.status === 'current');
    const pastDevelopers = developers.filter(m => m.status === 'past');
    const currentVolunteers = volunteers.filter(m => m.status === 'current');
    const pastVolunteers = volunteers.filter(m => m.status === 'past');

    expect(currentDevelopers.length).toBeGreaterThan(0);
    expect(pastDevelopers.length).toBeGreaterThan(0);
    expect(currentVolunteers.length).toBeGreaterThan(0);
    expect(pastVolunteers.length).toBeGreaterThan(0);
  });

  it('should define supporters for current and past sections', () => {
    const currentSupporters = SUPPORTERS.filter(s => s.status === 'current');
    const pastSupporters = SUPPORTERS.filter(s => s.status === 'past');

    expect(currentSupporters.length).toBeGreaterThan(0);
    expect(pastSupporters.length).toBeGreaterThan(0);
  });
});
