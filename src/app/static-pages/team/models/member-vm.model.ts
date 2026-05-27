import { TeamMember } from './team-member.model';

export interface MemberVm {
  member: TeamMember;
  /** Absolute router link to the member detail page. */
  link: string;
  /** Resolved thumbnail URL, falling back to the unavailable-photo asset. */
  thumbnailUrl: string;
}
