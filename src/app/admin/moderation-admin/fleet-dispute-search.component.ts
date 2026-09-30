import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { take } from 'rxjs';

import { COMMUNITY_AUDIENCE_LABELS } from 'src/app/fleet/constants/fleet-scope.constants';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import { AdminCommunitySummary } from 'src/app/models/fleet-governance.models';
import { FleetScopeStatus } from 'src/app/models/fleet.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/** The longest term the server takes. */
export const FLEET_DISPUTE_SEARCH_MAX_LENGTH = 50;

/** How each lifecycle state reads in the list. */
const STATUS_LABELS: Readonly<Record<FleetScopeStatus, string>> = {
  [FleetScopeStatus.ACTIVE]: 'Active',
  [FleetScopeStatus.SUSPENDED]: 'Suspended',
  [FleetScopeStatus.CLOSED]: 'Closed',
};

/**
 * The Admin area's way to a Community's dispute page (FC-050).
 *
 * Steve's decision of 30 September 2026: a site administrator reaches every
 * Community's dispute page, members-only and private ones included. Those
 * are on no directory, and their own pages are closed to a site administrator
 * who is not in them, so this finds any live Community by name or web
 * address, whoever may see it, and links straight to its dispute page.
 */
@Component({
  selector: 'app-fleet-dispute-search',
  templateUrl: './fleet-dispute-search.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetDisputeSearchComponent {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly appRoutes = APP_ROUTES;
  readonly maxLength = FLEET_DISPUTE_SEARCH_MAX_LENGTH;
  readonly audienceLabels = COMMUNITY_AUDIENCE_LABELS;
  readonly statusLabels = STATUS_LABELS;

  readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  readonly communities = signal<AdminCommunitySummary[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(1);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** The term the list was found with, which paging keeps. */
  readonly searched = signal('');

  /** How many pages the list holds. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  constructor() {
    this.load();
  }

  /** Finds Communities for the term in the box, from the first page. */
  protected find(): void {
    this.searched.set(this.form.controls.search.value.trim());
    this.page.set(1);
    this.load();
  }

  /**
   * Moves to another page of the same search.
   *
   * @param step - One back or one on.
   */
  protected turn(step: -1 | 1): void {
    this.page.update(page => page + step);
    this.load();
  }

  /**
   * Where a Community's entry leads.
   *
   * @param community - The Community.
   * @returns Its dispute page.
   */
  protected disputeLinkOf(community: AdminCommunitySummary): string[] {
    return [...FLEET_LINKS.communityManage(community.slug), 'dispute'];
  }

  /** Reads the page asked for. */
  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._governance
      .communitiesAsSiteAdmin(this.searched(), this.page())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          this.communities.set(page.items);
          this.total.set(page.total);
          this.pageSize.set(page.pageSize);
          this.isLoading.set(false);
        },
        error: () => {
          this.communities.set([]);
          this.total.set(0);
          this.errorMessage.set('Communities could not be read.');
          this.isLoading.set(false);
        },
      });
  }
}
