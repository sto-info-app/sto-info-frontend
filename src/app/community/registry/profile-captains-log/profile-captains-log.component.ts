import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { LOG_PAGE_SIZE } from 'src/app/dashboard/captains-log/captains-log.constants';
import { CaptainsLogService } from 'src/app/dashboard/captains-log/captains-log.service';
import { LogEntryCardComponent } from 'src/app/dashboard/captains-log/log-entry-card/log-entry-card.component';
import { PublicLogEntry } from 'src/app/models/captains-log.models';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { LcarsPaginationComponent } from 'src/app/shared/components/lcars-pagination/lcars-pagination.component';
import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';

/** What to say when the entries could not be read. */
export const PROFILE_LOG_LOAD_FAILED =
  "This officer's Captain's Log could not be loaded.";

/**
 * The Captain's entries on a public profile (sc-1450), newest first. The
 * profile is only reached while it is publicly visible, and the server
 * holds the entries to the same test. A profile with none shows nothing.
 */
@Component({
  selector: 'app-profile-captains-log',
  templateUrl: './profile-captains-log.component.html',
  styleUrls: ['./profile-captains-log.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CollapsibleSectionComponent,
    LcarsPaginationComponent,
    LogEntryCardComponent,
  ],
})
export class ProfileCaptainsLogComponent {
  private readonly _log = inject(CaptainsLogService);

  /** Whose profile it is. */
  readonly username = input.required<string>();

  /** Whether the reader may report an entry: signed in, and not its author. */
  readonly canReport = input(false);

  /** The reader asked to report an entry. */
  readonly report = output<PublicLogEntry>();

  readonly heading = APP_ROUTE_TITLES.STO_DASHBOARD_LOG;
  readonly entries = signal<PublicLogEntry[]>([]);
  readonly total = signal(0);
  /** The page shown: the first again whenever the profile changes. */
  readonly page = linkedSignal({
    source: this.username,
    computation: () => 1,
  });
  readonly errorMessage = signal('');

  /** How many pages there are. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / LOG_PAGE_SIZE)),
  );

  /**
   * Reads each page asked for, the latest only.
   */
  constructor() {
    toObservable(
      computed(() => ({ username: this.username(), page: this.page() })),
    )
      .pipe(
        switchMap(({ username, page }) =>
          this._log.listPublic(username, page).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(page => {
        this.errorMessage.set(page ? '' : PROFILE_LOG_LOAD_FAILED);
        this.entries.set(page?.items ?? []);
        this.total.set(page?.total ?? 0);
      });
  }

  /**
   * Turns a page.
   *
   * @param step - Back one or on one.
   */
  turn(step: -1 | 1): void {
    this.page.update(page => page + step);
  }
}
