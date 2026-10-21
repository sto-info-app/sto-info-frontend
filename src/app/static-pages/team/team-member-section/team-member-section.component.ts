import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { MemberVm } from '../models/member-vm.model';

@Component({
  selector: 'app-team-member-section',
  templateUrl: './team-member-section.component.html',
  styleUrls: ['./team-member-section.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CollapsibleSectionComponent],
})
export class TeamMemberSectionComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) vms!: MemberVm[];
  @Input({ required: true }) emptyMessage!: string;
}
