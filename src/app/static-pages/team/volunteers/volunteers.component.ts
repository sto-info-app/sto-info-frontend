import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TeamListBaseComponent } from '../team-list-base.component';
import { TeamMemberSectionComponent } from '../team-member-section/team-member-section.component';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

@Component({
  selector: 'app-team-volunteers',
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    TeamMemberSectionComponent,
    CollapsibleSectionComponent,
  ],
})
export class TeamVolunteersComponent extends TeamListBaseComponent {
  constructor() {
    super('volunteers', APP_ROUTES.ABOUT_VOLUNTEERS);
  }
}
