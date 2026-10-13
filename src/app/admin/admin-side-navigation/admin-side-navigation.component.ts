import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/**
 * The Navigation column beside an admin page, ending with the way back to
 * Admin home.
 *
 * A page's own links are projected in ahead of that one. Styled by the admin
 * pages' shared stylesheet, as the column always was, and its host takes no
 * box of its own, so the column is still a column of the page's layout.
 */
@Component({
  selector: 'app-admin-side-navigation',
  templateUrl: './admin-side-navigation.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './admin-side-navigation.component.scss',
  ],
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSideNavigationComponent {
  /** The Admin home page, without its leading slash. */
  readonly adminRoute = APP_ROUTES.ADMIN;
}
