import { TeamGroup } from './team-group.model';
import { TeamMemberInfoItem } from './team-member-info-item.model';
import { TeamStatus } from './team-status.model';

export interface TeamMember {
  slug: string;
  name: string;
  title: string;
  group: TeamGroup;
  status: TeamStatus;
  photoUrl: string;
  bio: string;
  info: TeamMemberInfoItem[];
  highlights?: string[];
}
