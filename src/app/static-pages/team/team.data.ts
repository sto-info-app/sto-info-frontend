import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';
import { Supporter } from './models/supporter.model';
import { TeamMember } from './models/team-member.model';

// The people credited on the About pages. Everything here is hand-kept; there
// is no admin screen for it, so a change is an edit to this file.
//
// TEAM_MEMBERS: one entry a developer or volunteer. Each field:
//   slug        The last part of the member's page address, under
//               /about/developers/ or /about/volunteers/ by their group. Lower
//               case with hyphens, unique within the group.
//   name        Shown on the list card's block and as the page's heading.
//   title       Their role, shown beside the photo on the card and under the
//               name on their page.
//   group       'developers' | 'volunteers' — which list page they appear on
//               (TeamGroup in models/team-group.model.ts).
//   status      'current' | 'past' — Active Duty or Retired on the list page
//               (TeamStatus in models/team-status.model.ts).
//   photoUrl    `${BASE_CLOUDFLARE_IMAGES_URL}/<image id>` with no variant on
//               the end; the pages add square100 for the card and square300
//               for the page. An empty string shows the "photo unavailable"
//               image instead.
//   bio         HTML, shown as-is in the Biography section of their page.
//   info        Label and value pairs for the Profile grid, in the order they
//               should appear. Any labels will do; the ones used so far are
//               Also Known As, Location, PC handle, PlayStation handle, Xbox
//               handle and Focus.
//   highlights  Optional. One line a bullet in the Highlights section; leave
//               it out to drop the section.
//
// SUPPORTERS: one entry a supporter, on the Supporters page.
//   name        Shown on the card's block.
//   status      'current' | 'past' — Current Supporters or Past Supporters.
//   note        Optional, shown beneath the name; without it the block stands
//               alone.
//
// The list cards rotate the LCARS palette by position, so order decides the
// colour each one takes. The models are in ./models and the test doubles the
// specs use are in ./testing/team-test-data.ts.

export const TEAM_MEMBERS: TeamMember[] = [
  {
    slug: 'steve-roberts',
    name: 'Steve Roberts',
    title: 'Creator and Lead Developer',
    group: 'developers',
    status: 'current',
    photoUrl: `${BASE_CLOUDFLARE_IMAGES_URL}/86e14bc1-3cfd-4c7a-9898-49f586da9700`,
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
