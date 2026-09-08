import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { PolicyHeaderComponent } from '../../shared/policy-header/policy-header.component';
import { STORYTIME_COPY } from '../../storytime.constants';

/**
 * The Storytime fan content and intellectual property notice.
 *
 * The one Storytime document written for people who are not publishing:
 * a reader wondering whether any of this is official, and a rights holder
 * wondering what the site claims. Both questions are answered plainly rather
 * than by reference to the other two documents, because somebody arriving here
 * from outside the community will not read three pages to find out.
 *
 * The short-form notice at the foot is the same constant shown on the landing
 * page and every other policy page, and is quoted from this document — this
 * page is where it comes from.
 */
@Component({
  selector: 'app-fan-content-notice',
  templateUrl: './fan-content-notice.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, PolicyHeaderComponent],
})
export class FanContentNoticeComponent {
  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;
}
