import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TeamListBaseComponent } from '../team-list-base.component';
import { TeamMemberSectionComponent } from '../team-member-section/team-member-section.component';

export type { MemberVm } from '../models/member-vm.model';

@Component({
  selector: 'app-team-developers',
  templateUrl: './developers.component.html',
  styleUrls: ['./developers.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, TeamMemberSectionComponent],
})
export class TeamDevelopersComponent extends TeamListBaseComponent {
  constructor() {
    super('developers', APP_ROUTES.ABOUT_DEVELOPERS);
  }
}
