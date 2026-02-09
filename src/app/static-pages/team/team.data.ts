import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';
import { Supporter } from './models/supporter.model';
import { TeamMember } from './models/team-member.model';

//NOTE: Use this constant for any team member without an image: PHOTO_UNAVAILABLE_BASE_URL

export const TEAM_MEMBERS: TeamMember[] = [
  {
    slug: 'steve-roberts',
    name: 'Steve Roberts',
    title: 'Creator and Lead Developer',
    group: 'developers',
    status: 'current',
    photoUrl: `${BASE_CLOUDFLARE_IMAGES_URL}/9bbe7e9d-a7a1-412a-8956-b15a150d8500`,
    bio: `<p>Steve is a UK-based senior software developer, best known in the Star Trek Online community as MidNiteShadow7.</p><p>He created the STO Info app after his original character-tracking spreadsheet outgrew its intended purpose and revealed a broader need for tools that reduce friction in day-to-day gameplay management — especially as many other community tools have since been discontinued.</p><p>His work focuses on building practical tools, clean and accessible interfaces, and reliable data flows that players can trust.</p>`,
    info: [
      { label: 'Also Known As', value: 'MidNiteShadow7' },
      { label: 'Location', value: 'United Kingdom' },
      {
        label: 'PC handle',
        value: '@MidNiteShadow7',
      },
      {
        label: 'PlayStation handle',
        value: '@MidNiteGeek',
      },
      {
        label: 'Xbox handle',
        value: '@MidNiteShadow77',
      },
      { label: 'Focus', value: 'App architecture, UX, and data integration' },
    ],
    highlights: [
      'Built and maintains the core systems that power accounts and characters.',
      'Shapes the LCARS-inspired interface and overall player experience.',
    ],
  },
];

export const SUPPORTERS: Supporter[] = [];
