import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import {
  FEATURE_UNAVAILABLE_COPY,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';

/**
 * Says why a feature the visitor asked for is not there.
 *
 * One component for both reasons, because the difference between them is a
 * sentence rather than a page: telling somebody the switch is off and telling
 * them the systems are not answering are the same act of courtesy, and giving
 * each its own component would be two copies of one notice kept in step by
 * hand.
 *
 * Not an error panel. Neither situation is the visitor's doing and neither is
 * a fault they can act on, so the notice is coloured as information — a red
 * alert for a feature somebody deliberately switched off would be theatre.
 */
@Component({
  selector: 'app-feature-unavailable',
  templateUrl: './feature-unavailable.component.html',
  styleUrls: ['./feature-unavailable.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureUnavailableComponent {
  /** The feature's name, as the rest of the site writes it. */
  @Input({ required: true }) featureName!: string;

  /** Why it cannot be reached. */
  @Input({ required: true }) reason!: FeatureUnavailableReason;

  /**
   * The heading for the reason given.
   *
   * @returns The heading text.
   */
  get title(): string {
    return this.reason === FEATURE_UNAVAILABLE_OFFLINE
      ? FEATURE_UNAVAILABLE_COPY.OFFLINE_TITLE
      : FEATURE_UNAVAILABLE_COPY.DISABLED_TITLE;
  }

  /**
   * The message for the reason given.
   *
   * @returns The message text.
   */
  get message(): string {
    return this.reason === FEATURE_UNAVAILABLE_OFFLINE
      ? FEATURE_UNAVAILABLE_COPY.offline(this.featureName)
      : FEATURE_UNAVAILABLE_COPY.disabled(this.featureName);
  }
}
