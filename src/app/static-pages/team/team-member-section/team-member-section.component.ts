import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MemberVm } from '../models/member-vm.model';

@Component({
  selector: 'app-team-member-section',
  templateUrl: './team-member-section.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
})
export class TeamMemberSectionComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) vms!: MemberVm[];
  @Input({ required: true }) emptyMessage!: string;
}
