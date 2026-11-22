import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import {
  FLEET_SCOPE_ICONS,
  FLEET_SCOPE_LABELS,
  FleetScopeType,
} from 'src/app/fleet/constants/fleet-scope.constants';

/**
 * Says whether a thing is a Community, a Fleet or an Armada, and on which
 * platform.
 *
 * Small enough to be tempting to write out by hand in each template, which is
 * exactly why it is a component: the badge appears on directory cards, page
 * headings and search results, and three hand-written copies would be three
 * chances for a Fleet to be labelled a Community.
 *
 * The platform is part of a Fleet's identity rather than a detail about it —
 * the same Fleet name exists separately on PC, Xbox and PlayStation — so it
 * reads as one badge with two halves rather than two badges.
 */
@Component({
  selector: 'app-fleet-scope-badge',
  templateUrl: './fleet-scope-badge.component.html',
  styleUrls: ['./fleet-scope-badge.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetScopeBadgeComponent {
  /** Which level of the hierarchy the badge is describing. */
  @Input({ required: true }) scope!: FleetScopeType;

  /**
   * The platform name, where there is one.
   *
   * A Community spans every platform, so it has none; a Fleet and an Armada
   * each live on exactly one.
   */
  @Input() platform: string | null = null;

  /**
   * The scope's name, as the rest of the site writes it.
   *
   * @returns The label text.
   */
  get label(): string {
    return FLEET_SCOPE_LABELS[this.scope];
  }

  /**
   * The Font Awesome classes for the scope's icon.
   *
   * @returns The icon classes.
   */
  get iconClass(): string {
    return FLEET_SCOPE_ICONS[this.scope];
  }

  /**
   * The badge read out as one phrase.
   *
   * The icon is decorative and the platform is shown in its own half, so
   * without this a screen reader announces "Fleet PC" as two unrelated
   * fragments.
   *
   * @returns The accessible label.
   */
  get ariaLabel(): string {
    return this.platform ? `${this.label} on ${this.platform}` : this.label;
  }
}
