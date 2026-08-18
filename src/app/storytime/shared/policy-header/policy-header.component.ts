import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  STORYTIME_POLICY_EFFECTIVE_DATE,
  STORYTIME_POLICY_VERSION,
} from '../../storytime.constants';

/**
 * The heading shared by the three Storytime publishing documents.
 *
 * They are written to be read together — each defers to the other two on
 * points it does not settle — so a reader who arrives at one needs the others
 * within reach. Putting the cross-links, the version and the effective date in
 * one component means all three pages carry the same ones, rather than three
 * templates drifting apart every time the set changes.
 */
@Component({
  selector: 'app-policy-header',
  templateUrl: './policy-header.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class PolicyHeaderComponent {
  /** The document's title, shown as the page heading. */
  @Input({ required: true }) title!: string;

  /** One line saying what the document is for. */
  @Input({ required: true }) intro!: string;

  /**
   * Which of the three documents this is.
   *
   * The matching cross-link is rendered as plain text rather than a link, so a
   * reader can see where they are without following a link back to it.
   */
  @Input({ required: true }) current!: 'policy' | 'terms' | 'notice';

  /** The version of the terms this build presents. */
  readonly version = STORYTIME_POLICY_VERSION;

  /** When that version took effect. */
  readonly effectiveDate = STORYTIME_POLICY_EFFECTIVE_DATE;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;
}
