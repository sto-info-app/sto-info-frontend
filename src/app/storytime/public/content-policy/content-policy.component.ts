import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ContentRating,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { PolicyHeaderComponent } from '../../shared/policy-header/policy-header.component';
import {
  CONTENT_POLICY_RULES,
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
} from '../../storytime.constants';

/**
 * The Storytime content policy.
 *
 * The prose is the published document condensed to what a creator or reader
 * actually has to act on; the rules, ratings and representations are not prose
 * at all but the same constants the report form, the rating banners and the
 * publish checklist are built from. That is deliberate — a policy page that
 * describes categories the feature does not enforce, or omits ones it does, is
 * worse than no page, because somebody relies on it.
 */
@Component({
  selector: 'app-content-policy',
  templateUrl: './content-policy.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, PolicyHeaderComponent],
})
export class ContentPolicyComponent {
  /** What the policy covers, in the order it is presented. */
  readonly rules = CONTENT_POLICY_RULES;

  /** What a creator confirms when they accept the terms for a Story. */
  readonly representations = PUBLISHING_REPRESENTATIONS;

  /** The ratings, in increasing order of what they permit. */
  readonly ratings = [
    ContentRating.GENERAL,
    ContentRating.MATURE,
    ContentRating.ADULTS_ONLY,
  ];

  /** How each rating is named, as readers meet it elsewhere. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** How each rating is explained, as the warning banners explain it. */
  readonly ratingDescriptions = CONTENT_RATING_DESCRIPTIONS;

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;
}
