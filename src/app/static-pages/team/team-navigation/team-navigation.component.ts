import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { TeamNavLink } from '../models/team-nav-link.model';

/**
 * The side column of a team list page: a Navigation panel holding the way to
 * the other list, About the App and Supporters, the same stack of full-width
 * buttons a member's own page carries.
 *
 * One component for both lists, so the Developers and Volunteers templates
 * each name it once rather than repeating the markup.
 */
@Component({
  selector: 'app-team-navigation',
  templateUrl: './team-navigation.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CollapsibleSectionComponent],
})
export class TeamNavigationComponent {
  @Input({ required: true }) links!: TeamNavLink[];
}
