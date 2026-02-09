import { Supporter } from '../models/supporter.model';
import { TeamGroup } from '../models/team-group.model';
import { TeamMember } from '../models/team-member.model';
import { TeamStatus } from '../models/team-status.model';

const developersGroup: TeamGroup = 'developers';
const volunteersGroup: TeamGroup = 'volunteers';
const currentStatus: TeamStatus = 'current';
const pastStatus: TeamStatus = 'past';

export const TEST_TEAM_MEMBERS: TeamMember[] = [
  {
    slug: 'spock',
    name: 'Spock',
    title: 'Science Officer',
    group: developersGroup,
    status: currentStatus,
    photoUrl: 'https://example.com/spock',
    bio: '<p>First officer known for logic-driven solutions.</p>',
    info: [{ label: 'Focus', value: 'Systems reliability' }],
    highlights: ['Optimized complex workflows with precision.'],
  },
  {
    slug: 'scotty',
    name: 'Montgomery Scott',
    title: 'Chief Engineer',
    group: developersGroup,
    status: pastStatus,
    photoUrl: 'https://example.com/scotty',
    bio: '<p>Kept the engines running against impossible odds.</p>',
    info: [{ label: 'Focus', value: 'Performance tuning' }],
  },
  {
    slug: 'janeway',
    name: 'Kathryn Janeway',
    title: 'Captain',
    group: volunteersGroup,
    status: currentStatus,
    photoUrl: 'https://example.com/janeway',
    bio: '<p>Led with resolve and curiosity in deep space.</p>',
    info: [{ label: 'Focus', value: 'Community strategy' }],
  },
  {
    slug: 'tuvok',
    name: 'Tuvok',
    title: 'Security Officer',
    group: volunteersGroup,
    status: pastStatus,
    photoUrl: 'https://example.com/tuvok',
    bio: '<p>Maintained order with calm discipline.</p>',
    info: [{ label: 'Focus', value: 'Quality review' }],
  },
];

export const TEST_SUPPORTERS: Supporter[] = [
  {
    name: 'Hikaru Sulu',
    status: currentStatus,
    note: 'Steady support through navigation upgrades.',
  },
  {
    name: 'Geordi La Forge',
    status: pastStatus,
    note: 'Early feedback on visual systems.',
  },
];
