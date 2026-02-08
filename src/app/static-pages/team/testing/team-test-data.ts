import { Supporter } from '../models/supporter.model';
import { TeamMember } from '../models/team-member.model';

export const TEST_TEAM_MEMBERS: TeamMember[] = [
  {
    slug: 'spock',
    name: 'Spock',
    title: 'Science Officer',
    group: 'developers',
    status: 'current',
    photoUrl: 'https://example.com/spock',
    bio: '<p>First officer known for logic-driven solutions.</p>',
    info: [{ label: 'Focus', value: 'Systems reliability' }],
    highlights: ['Optimized complex workflows with precision.'],
  },
  {
    slug: 'scotty',
    name: 'Montgomery Scott',
    title: 'Chief Engineer',
    group: 'developers',
    status: 'past',
    photoUrl: 'https://example.com/scotty',
    bio: '<p>Kept the engines running against impossible odds.</p>',
    info: [{ label: 'Focus', value: 'Performance tuning' }],
  },
  {
    slug: 'janeway',
    name: 'Kathryn Janeway',
    title: 'Captain',
    group: 'volunteers',
    status: 'current',
    photoUrl: 'https://example.com/janeway',
    bio: '<p>Led with resolve and curiosity in deep space.</p>',
    info: [{ label: 'Focus', value: 'Community strategy' }],
  },
  {
    slug: 'tuvok',
    name: 'Tuvok',
    title: 'Security Officer',
    group: 'volunteers',
    status: 'past',
    photoUrl: 'https://example.com/tuvok',
    bio: '<p>Maintained order with calm discipline.</p>',
    info: [{ label: 'Focus', value: 'Quality review' }],
  },
];

export const TEST_SUPPORTERS: Supporter[] = [
  {
    name: 'Hikaru Sulu',
    status: 'current',
    note: 'Steady support through navigation upgrades.',
  },
  {
    name: 'Geordi La Forge',
    status: 'past',
    note: 'Early feedback on visual systems.',
  },
];
