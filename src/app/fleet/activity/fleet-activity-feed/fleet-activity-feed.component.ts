import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Observable, Subscription } from 'rxjs';

import { FleetActivityService } from 'src/app/fleet/activity/fleet-activity.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import {
  FleetActivityItem,
  FleetActivityPage,
} from 'src/app/models/fleet-activity.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** Which feed to show: a scope's, or the signed-in person's own. */
export type FleetActivitySource =
  | { readonly kind: 'SCOPE'; readonly target: GovernanceTarget }
  | { readonly kind: 'MINE' };

/** What to say when a feed could not be read. */
export const FLEET_ACTIVITY_FAILED =
  'The activity could not be read just now. Please try again shortly.';

/**
 * An activity feed, newest first (FC-029).
 *
 * Each item is a sentence the server wrote from the data as it stands, for
 * this reader, with a link where there is somewhere to read more. As a full
 * feed it offers older items a page at a time; with `latest` set it shows
 * that many and a link to the rest.
 */
@Component({
  selector: 'app-fleet-activity-feed',
  templateUrl: './fleet-activity-feed.component.html',
  styleUrls: ['./fleet-activity-feed.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, RouterLink],
})
export class FleetActivityFeedComponent {
  private readonly _activity = inject(FleetActivityService);
  private readonly _destroyRef = inject(DestroyRef);

  /** Whether each item names its scope, as a feed across scopes must. */
  @Input() showScope = false;

  /** How many to show, with a link to the rest; null for the whole feed. */
  @Input() latest: number | null = null;

  /** Where the rest of the feed is, when showing only the latest. */
  @Input() allLink: string[] | null = null;

  /** The items read so far. */
  readonly items = signal<readonly FleetActivityItem[]>([]);

  /** Where the next page starts, or null at the end. */
  readonly next = signal<string | null>(null);

  /** Whether a page is being read. */
  readonly loading = signal(false);

  /** What went wrong, if anything. */
  readonly error = signal<string | null>(null);

  private _source: FleetActivitySource | null = null;

  private _reading: Subscription | null = null;

  @Input({ required: true }) set source(value: FleetActivitySource) {
    this._source = value;
    this.items.set([]);
    this.next.set(null);
    this.read(null);
  }

  /** Reads the next page, adding it below. */
  onOlder(): void {
    this.read(this.next());
  }

  /**
   * The items to show.
   *
   * @returns All read, or only the latest.
   */
  shown(): readonly FleetActivityItem[] {
    return this.latest === null
      ? this.items()
      : this.items().slice(0, this.latest);
  }

  /**
   * Reads a page.
   *
   * @param before - Where to carry on from, or null for the newest.
   */
  private read(before: string | null): void {
    const source = this._source as FleetActivitySource;
    const page$: Observable<FleetActivityPage> =
      source.kind === 'MINE'
        ? this._activity.mine(before)
        : this._activity.scopeFeed(source.target, before);

    this._reading?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this._reading = page$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: page => {
        this.items.update(items => [...items, ...page.items]);
        this.next.set(page.next);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(FLEET_ACTIVITY_FAILED);
      },
    });
  }
}
