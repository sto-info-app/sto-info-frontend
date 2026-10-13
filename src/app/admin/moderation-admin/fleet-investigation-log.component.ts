import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { take } from 'rxjs';

import { AdminSideNavigationComponent } from 'src/app/admin/admin-side-navigation/admin-side-navigation.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import { FleetInvestigation } from 'src/app/models/fleet-governance.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsPaginationComponent } from 'src/app/shared/components/lcars-pagination/lcars-pagination.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** A page of the log. */
const PAGE_SIZE = 20;

/**
 * Every site admin's look into a Fleet's imports, newest first (FC-036): who
 * looked, where, why and until when. A look still open links to the Fleet's
 * Investigate pages; opening one is done from the Community's dispute page,
 * with a purpose.
 */
@Component({
  selector: 'app-fleet-investigation-log',
  templateUrl: './fleet-investigation-log.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    AdminSideNavigationComponent,
    AppDatePipe,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LcarsPaginationComponent,
    LoadingBarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetInvestigationLogComponent {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly looks = signal<FleetInvestigation[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** How many pages the log holds. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / PAGE_SIZE)),
  );

  constructor() {
    this.load();
  }

  /**
   * Moves to another page.
   *
   * @param step - One back or one on.
   */
  protected turn(step: -1 | 1): void {
    this.page.update(page => page + step);
    this.load();
  }

  /**
   * Where an open look leads.
   *
   * @param look - The look.
   * @returns The Fleet's Investigate page, or null once it has ended or its
   *   Community has gone.
   */
  protected linkOf(look: FleetInvestigation): string[] | null {
    return look.active && look.communitySlug !== null
      ? FLEET_LINKS.fleetInvestigate(
          look.communitySlug,
          look.platformSegment,
          look.fleetSlug,
        )
      : null;
  }

  /** Reads the page asked for. */
  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._governance
      .investigations(this.page())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          this.looks.set(page.items);
          this.total.set(page.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.looks.set([]);
          this.errorMessage.set('The log could not be read.');
          this.isLoading.set(false);
        },
      });
  }
}
