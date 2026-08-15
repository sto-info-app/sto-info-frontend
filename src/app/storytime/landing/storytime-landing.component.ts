import { Component } from '@angular/core';
import { STORYTIME_COPY } from '../storytime.constants';

/**
 * The Storytime landing page.
 *
 * Currently the feature's entry point and little else. Discovery — the
 * Spotlight, recent Stories, Arcs and search — arrives with the epics that
 * build them; this establishes the route, the shell and the copy they will
 * hang from.
 *
 * It does not check the feature switches itself: the route guard has already
 * refused the visitor if Storytime is off, so re-checking here would duplicate
 * the decision and risk the two disagreeing.
 */
@Component({
  selector: 'app-storytime-landing',
  templateUrl: './storytime-landing.component.html',
  standalone: true,
})
export class StorytimeLandingComponent {
  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;
}
