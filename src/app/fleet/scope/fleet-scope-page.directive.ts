import { HttpErrorResponse } from '@angular/common/http';
import { Directive, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import {
  FleetScopePageState,
  FleetScopeReadyState,
} from './fleet-scope-page.models';

/** Shown when a scope could not be read for any reason but its absence. */
export const FLEET_SCOPE_ERROR =
  'This record could not be read. Please try again.';

/**
 * The half of a scope page that is the same for a Community, a Fleet and an
 * Armada.
 *
 * A whole address is resolved in one request, and the answer says whether
 * the address used is still the canonical one. When it is not, the page
 * replaces its own history entry rather than pushing a second one: a reader
 * who arrived on a retired slug and then pressed Back would otherwise be
 * sent to the retired slug again, and straight back here — a loop they
 * cannot leave without holding the button down. The server answers `200`
 * rather than `301` precisely so this decision is the client's to make
 * (ADR-0022).
 *
 * Absent and failed are told apart. "No such Fleet" and "the directory is
 * down" call for different things from a reader, and a page that said the
 * second when it meant the first would send somebody looking for an outage
 * that is not there. A record the viewer may not see is reported absent,
 * which is the server's decision and not this page's: reporting it as
 * forbidden would confirm that a private Community exists.
 */
@Directive()
export abstract class FleetScopePageDirective<TResolved> {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _router = inject(Router);
  protected readonly _pageTitle = inject(PageTitleService);
  protected readonly _datePipe = inject(AppDatePipe);

  /** What to say when nothing answers to the address. */
  abstract readonly missingMessage: string;

  /**
   * Asks for the record again without the address having changed.
   *
   * What a picture is delivered from only comes into existence when its scan
   * clears, so nothing on this side knows the new address until the server
   * is asked. A page that guessed at it would show a broken image for as
   * long as the guess was wrong.
   */
  private readonly _reload = new BehaviorSubject<void>(undefined);

  /**
   * The record, reloaded whenever the address changes or it is asked for.
   */
  readonly state$: Observable<FleetScopePageState> = combineLatest([
    this._route.paramMap,
    this._reload,
  ]).pipe(
    switchMap(([params]) =>
      this.resolve(params).pipe(
        tap(resolved => this.replaceMovedAddress(resolved)),
        map(resolved => this.present(resolved)),
        // The record names its own page. The name is trimmed for the browser
        // tab alone: a tab strip collapses an edge space to nothing anyway,
        // and the page itself still draws it.
        tap(state => this._pageTitle.setTitle(state.header.name.trim())),
        catchError((error: HttpErrorResponse) =>
          of<FleetScopePageState>(
            error.status === 404
              ? { kind: 'MISSING' }
              : { kind: 'ERROR', message: FLEET_SCOPE_ERROR },
          ),
        ),
        startWith<FleetScopePageState>({ kind: 'LOADING' }),
      ),
    ),
  );

  /**
   * Reads the record again, keeping the address.
   *
   * The loading bar comes back while it runs, because the page is genuinely
   * not showing the record as it now stands.
   */
  reload(): void {
    this._reload.next();
  }

  /**
   * Asks the server for whatever the address names.
   *
   * @param params - The address, in segments.
   * @returns The record and the current form of every segment.
   */
  protected abstract resolve(params: ParamMap): Observable<TResolved>;

  /**
   * Whether the address the reader used is no longer the canonical one.
   *
   * @param resolved - The server's answer.
   * @returns True when the address should be replaced.
   */
  protected abstract hasMoved(resolved: TResolved): boolean;

  /**
   * The address this record should be at.
   *
   * @param resolved - The server's answer.
   * @returns The router link to replace the current address with.
   */
  protected abstract canonicalLink(resolved: TResolved): string[];

  /**
   * Turns the server's answer into what the page draws.
   *
   * @param resolved - The server's answer.
   * @returns The page's ready state.
   */
  protected abstract present(resolved: TResolved): FleetScopeReadyState;

  /**
   * Writes an instant out in the reader's own timezone.
   *
   * @param value - The instant, as the server sent it.
   * @returns The date as the reader would write it.
   */
  protected formatInstant = (value: string): string =>
    this._datePipe.transform(value) ?? value;

  /**
   * Quietly corrects the address when the one used has been retired.
   *
   * @param resolved - The server's answer.
   */
  private replaceMovedAddress(resolved: TResolved): void {
    if (!this.hasMoved(resolved)) {
      return;
    }

    void this._router.navigate(this.canonicalLink(resolved), {
      replaceUrl: true,
      // The reader's question survives the correction. Nothing on a scope
      // page reads the query string today, but a link somebody shared with
      // one on it should not be quietly stripped of it.
      queryParamsHandling: 'preserve',
    });
  }
}
