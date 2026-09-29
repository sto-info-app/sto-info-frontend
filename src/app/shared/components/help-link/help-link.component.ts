import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/**
 * A small link from a page to the Help guide about it (FC-049, FC-050).
 *
 * Steve's decisions of 29 September 2026 put one under each heading of the
 * Settings page and under the heading of each Fleet page, so a reader stuck
 * on a page is one step from its guide. Written once here so every page's
 * link looks and reads the same.
 */
@Component({
  selector: 'app-help-link',
  templateUrl: './help-link.component.html',
  styleUrls: ['./help-link.component.scss'],
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpLinkComponent {
  /** The guide's slug. */
  readonly slug = input.required<string>();

  /** What the link says, such as “Help with Privacy Mode”. */
  readonly label = input.required<string>();

  /**
   * The guide's address.
   *
   * @returns The path.
   */
  path(): string {
    return `/${APP_ROUTES.HELP_GUIDE.replace(':guideSlug', this.slug())}`;
  }
}
