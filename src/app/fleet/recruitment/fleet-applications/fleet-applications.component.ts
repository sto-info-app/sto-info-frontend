import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  APPLICATION_ROUTE_LABELS,
  APPLICATION_STATUS_LABELS,
  APPLICATIONS_VIEW_CAPABILITY,
} from 'src/app/fleet/recruitment/recruitment.constants';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetApplicationPage,
  FleetApplicationStatus,
} from 'src/app/models/fleet-recruitment.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the applications. */
export const FLEET_APPLICATIONS_NOT_PERMITTED =
  'Reading this Fleet’s applications is for its recruiters.';

/** The filters, in the order they are offered. */
export const APPLICATION_FILTERS: readonly FleetApplicationStatus[] = [
  FleetApplicationStatus.PENDING,
  FleetApplicationStatus.ACCEPTED,
  FleetApplicationStatus.REJECTED,
  FleetApplicationStatus.WITHDRAWN,
];

/** What each filter is called. */
export const APPLICATION_FILTER_LABELS: Record<FleetApplicationStatus, string> =
  {
    [FleetApplicationStatus.PENDING]: 'Waiting',
    [FleetApplicationStatus.ACCEPTED]: 'Accepted',
    [FleetApplicationStatus.REJECTED]: 'Rejected',
    [FleetApplicationStatus.WITHDRAWN]: 'Withdrawn',
  };

/** One page of a Fleet's applications, with what it was asked for. */
export interface FleetApplicationsData {
  readonly section: FleetSection;
  readonly status: FleetApplicationStatus;
  readonly page: FleetApplicationPage;
}

/**
 * A Fleet's applications, for its recruiters (FC-021).
 *
 * Those waiting come first, which is what a recruiter opens the page for;
 * the rest are a filter away. A join and an accepted invitation are listed
 * too, as accepted, because every way into the Fleet leaves one record.
 * Which status and page are shown is in the address, so a filtered list can
 * be shared and the back button returns to it.
 */
@Component({
  selector: 'app-fleet-applications',
  templateUrl: './fleet-applications.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class FleetApplicationsComponent extends FleetSectionPageDirective<FleetApplicationsData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _router = inject(Router);

  readonly notPermittedMessage = FLEET_APPLICATIONS_NOT_PERMITTED;
  readonly filters = APPLICATION_FILTERS;
  readonly filterLabels = APPLICATION_FILTER_LABELS;
  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly routeLabels = APPLICATION_ROUTE_LABELS;

  protected readonly _requiredCapabilities = [APPLICATIONS_VIEW_CAPABILITY];

  protected override readonly _needsRoster = false;

  /**
   * How many pages there are.
   *
   * @param page - The page shown.
   * @returns At least one.
   */
  totalPages(page: FleetApplicationPage): number {
    return Math.max(1, Math.ceil(page.total / page.pageSize));
  }

  /**
   * Where one application is read.
   *
   * @param data - The page.
   * @param applicationId - The application.
   * @returns The router link.
   */
  applicationLink(
    data: FleetApplicationsData,
    applicationId: string,
  ): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetApplication(
      communitySlug,
      platformSegment,
      fleetSlug,
      applicationId,
    );
  }

  /**
   * Shows another status, from its first page.
   *
   * @param status - The status.
   */
  onFilter(status: FleetApplicationStatus): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {
        status: status === FleetApplicationStatus.PENDING ? null : status,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Shows another page.
   *
   * @param page - The page.
   */
  onPage(page: number): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Reads the page of applications the address asks for.
   *
   * @param section - The Fleet.
   * @param query - The status and page asked for.
   * @returns The page.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<FleetApplicationsData> {
    const asked = query.get('status') as FleetApplicationStatus | null;
    const status =
      asked !== null && APPLICATION_FILTERS.includes(asked)
        ? asked
        : FleetApplicationStatus.PENDING;
    const page = Math.max(1, Number(query.get('page')) || 1);

    return this._recruitment
      .applications(section.communityId, section.fleetId, { status, page })
      .pipe(map(applications => ({ section, status, page: applications })));
  }
}
