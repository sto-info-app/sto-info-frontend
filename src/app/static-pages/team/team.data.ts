import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';
import { Supporter } from './models/supporter.model';
import { TeamMember } from './models/team-member.model';
import teamMembers from './team-members.json';

// The people credited on the About pages. Everything here is hand-kept; there
// is no admin screen for it, so a change is an edit to team-members.json or
// to SUPPORTERS below.
//
// team-members.json: one entry a developer or volunteer. Each field:
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
//   photoId     The Cloudflare Images id of their photo, with no variant on the
//               end; it becomes photoUrl, and the pages add square100 for the
//               card and square300 for the page. An empty string shows the
//               "photo unavailable" image instead.
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

/** A team-members.json entry, before its photo id becomes a URL. */
type TeamMemberRecord = Omit<TeamMember, 'photoUrl'> & { photoId: string };

export const TEAM_MEMBERS: TeamMember[] = (
  teamMembers as TeamMemberRecord[]
).map(({ photoId, ...member }) => ({
  ...member,
  photoUrl: photoId ? `${BASE_CLOUDFLARE_IMAGES_URL}/${photoId}` : '',
}));

export const SUPPORTERS: Supporter[] = [];
