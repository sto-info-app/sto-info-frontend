import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  CONTENT_POLICY_RULES,
  STORYTIME_COPY,
} from '../../storytime.constants';

/**
 * The Storytime content policy.
 *
 * The wording here is placeholder: the categories are the ones the feature
 * actually enforces — they are the same list a reporter picks from and an
 * administrator cites — but the legal phrasing around them is to be supplied
 * once the feature is finished. Building the page against the real categories
 * now means the final copy replaces sentences rather than structure.
 */
@Component({
  selector: 'app-content-policy',
  templateUrl: './content-policy.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class ContentPolicyComponent {
  /** What the policy covers, in the order it is presented. */
  readonly rules = CONTENT_POLICY_RULES;

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;
}
