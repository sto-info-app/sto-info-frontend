import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import {
  FleetCommunityCard,
  FleetCommunityDirectoryQuery,
  FleetDirectoryPage,
  FleetDirectoryQuery,
  StoArmadaCard,
  StoArmadaDirectoryQuery,
  StoFleetCard,
  StoFleetDirectoryQuery,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reads the three public Fleet directories.
 *
 * No access token is attached, and that is deliberate rather than an
 * oversight: the three listings answer the same records in the same order to
 * everybody, so there is nothing an account would unlock and nothing to
 * narrow. A member reading their own Community's private Fleets does it
 * through that Community's own routes, where the check is made once against a
 * scope named in the path.
 *
 * Nothing here is cached. A directory is read by somebody searching and
 * filtering, so almost every call has a different question in it, and a cache
 * keyed on the whole query would hold one answer per keystroke.
 */
@Injectable({ providedIn: 'root' })
export class FleetDirectoryService {
  private readonly _http = inject(HttpClient);

  /**
   * Lists public Fleet Communities.
   *
   * @param query - Search, filters, ordering and paging.
   * @returns An observable of one page of Community cards.
   */
  listCommunities(
    query: FleetCommunityDirectoryQuery = {},
  ): Observable<FleetDirectoryPage<FleetCommunityCard>> {
    let params = this.sharedParams(query);

    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    if (query.recruitmentState) {
      params = params.set('recruitmentState', query.recruitmentState);
    }

    return this._http.get<FleetDirectoryPage<FleetCommunityCard>>(
      API_URLS.FLEET_COMMUNITIES,
      { params },
    );
  }

  /**
   * Lists public Fleets, each with how many others answer to its name.
   *
   * @param query - Search, filters, ordering and paging.
   * @returns An observable of one page of Fleet cards.
   */
  listFleets(
    query: StoFleetDirectoryQuery = {},
  ): Observable<FleetDirectoryPage<StoFleetCard>> {
    let params = this.sharedParams(query);

    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    if (query.platformId) {
      params = params.set('platformId', query.platformId);
    }

    if (query.recruitmentState) {
      params = params.set('recruitmentState', query.recruitmentState);
    }

    if (query.allegianceFactionId) {
      params = params.set('allegianceFactionId', query.allegianceFactionId);
    }

    // Tested against undefined rather than for truthiness, because `false` is
    // the half of this filter that asks for Fleets nothing has ever imported
    // — the half somebody checking coverage actually wants.
    if (query.withRoster !== undefined) {
      params = params.set('withRoster', String(query.withRoster));
    }

    if (query.freshWithinDays !== undefined) {
      params = params.set('freshWithinDays', String(query.freshWithinDays));
    }

    return this._http.get<FleetDirectoryPage<StoFleetCard>>(API_URLS.FLEETS, {
      params,
    });
  }

  /**
   * Lists Armadas held by public Communities.
   *
   * @param query - Search, filters, ordering and paging.
   * @returns An observable of one page of Armada cards.
   */
  listArmadas(
    query: StoArmadaDirectoryQuery = {},
  ): Observable<FleetDirectoryPage<StoArmadaCard>> {
    let params = this.sharedParams(query);

    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    if (query.platformId) {
      params = params.set('platformId', query.platformId);
    }

    return this._http.get<FleetDirectoryPage<StoArmadaCard>>(API_URLS.ARMADAS, {
      params,
    });
  }

  /**
   * Builds the parameters every listing accepts, omitting anything unset.
   *
   * An unset parameter is left off rather than sent empty. The server refuses
   * a parameter it does not recognise and validates every one it does, so
   * `?search=` is a search for the empty string rather than no search at all.
   *
   * @param query - The parts of the query the three listings share.
   * @returns The HTTP parameters to send.
   */
  private sharedParams(query: FleetDirectoryQuery): HttpParams {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    if (query.page) {
      params = params.set('page', String(query.page));
    }

    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return params;
  }
}
