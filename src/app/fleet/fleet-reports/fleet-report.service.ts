import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { paramsOf } from 'src/app/fleet/roster/roster.service';
import { FleetAudience } from 'src/app/models/fleet.models';
import {
  FleetActivityReport,
  FleetContributionReport,
  FleetGrowthReport,
  FleetRanksReport,
  FleetReport,
  FleetReportAccess,
  FleetReportAudiences,
  FleetReportQuery,
  FleetTenureReport,
} from 'src/app/models/fleet-report.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Each report's answer, by report. */
export interface FleetReportsByKind {
  [FleetReport.GROWTH]: FleetGrowthReport;
  [FleetReport.TENURE]: FleetTenureReport;
  [FleetReport.RANKS]: FleetRanksReport;
  [FleetReport.ACTIVITY]: FleetActivityReport;
  [FleetReport.CONTRIBUTION]: FleetContributionReport;
}

/**
 * Reading a Fleet's reports, exporting them, and choosing who may see each
 * (FC-020).
 *
 * A report can be public, so a read carries the viewer's token when they
 * have one and goes without when they do not: the server decides how much
 * of it they are shown. Changing an audience is the Owner's, and is signed.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetReportService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the reports the viewer may see, and how much of each.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the list.
   */
  visible(
    communityId: string,
    fleetId: string,
  ): Observable<FleetReportAccess[]> {
    return this._http.get<FleetReportAccess[]>(
      this.reportsUrl(communityId, fleetId),
      this.viewerOptions(),
    );
  }

  /**
   * Reads one report.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param report - The report.
   * @param query - The span, and the export its detail is drawn at.
   * @returns An observable of the report.
   */
  report<K extends FleetReport>(
    communityId: string,
    fleetId: string,
    report: K,
    query: FleetReportQuery,
  ): Observable<FleetReportsByKind[K]> {
    return this._http.get<FleetReportsByKind[K]>(
      `${this.reportsUrl(communityId, fleetId)}/${report.toLowerCase()}`,
      { ...this.viewerOptions(), params: paramsOf({ ...query }) },
    );
  }

  /**
   * Downloads one report as CSV.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param report - The report.
   * @param query - The span, and the export its detail is drawn at.
   * @returns An observable of the file.
   */
  csv(
    communityId: string,
    fleetId: string,
    report: FleetReport,
    query: FleetReportQuery,
  ): Observable<Blob> {
    return this._http.get(
      `${this.reportsUrl(communityId, fleetId)}/${report.toLowerCase()}/csv`,
      {
        ...this.viewerOptions(),
        params: paramsOf({ ...query }),
        responseType: 'blob',
      },
    );
  }

  /**
   * Reads every report's audience and every change to one.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the audiences.
   */
  audiences(
    communityId: string,
    fleetId: string,
  ): Observable<FleetReportAudiences> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<FleetReportAudiences>(
      `${this.reportsUrl(communityId, fleetId)}/audiences`,
      httpOptions,
    );
  }

  /**
   * Changes who may see one report.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param report - The report.
   * @param audience - Who may see it now.
   * @returns An observable of every audience, as after it.
   */
  setAudience(
    communityId: string,
    fleetId: string,
    report: FleetReport,
    audience: FleetAudience,
  ): Observable<FleetReportAudiences> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.put<FleetReportAudiences>(
      `${this.reportsUrl(communityId, fleetId)}/${report.toLowerCase()}/audience`,
      { audience },
      httpOptions,
    );
  }

  /**
   * The viewer's token, when they have one.
   *
   * @returns The request options, empty for a signed-out viewer.
   */
  private viewerOptions(): Record<string, unknown> {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }

  /**
   * Where a Fleet's reports live.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The URL, without a trailing slash.
   */
  private reportsUrl(communityId: string, fleetId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}/reports`;
  }
}
