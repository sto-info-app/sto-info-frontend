import { TeamStatus } from './team-status.model';

export interface Supporter {
  name: string;
  status: TeamStatus;
  note?: string;
}
