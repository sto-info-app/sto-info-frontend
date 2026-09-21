import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Directive, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  take,
} from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ScopeDuplicateVm, ScopeRegisterState } from './scope-register.models';

/** Shown when the Community or the platform catalogue could not be read. */
export const SCOPE_REGISTER_UNREADABLE =
  'This page could not be prepared. Please try again.';

/** Shown when the registration itself failed for a reason nobody can act on. */
export const SCOPE_REGISTER_FAILED =
  'The registration could not be completed. Please try again.';

/** Shown when the web address somebody typed was taken in the meantime. */
export const SCOPE_REGISTER_SLUG_TAKEN =
  'Somebody registered that web address a moment before you did. Change it, ' +
  'or leave it blank and one will be made from the name.';

/** Shown when the registrant may not register into this Community. */
export const SCOPE_REGISTER_FORBIDDEN =
  'You do not have permission to register anything into this Community.';

/**
 * The half of a Fleet or Armada registration form that is the same for both.
 *
 * Both are registered into a Community named by slug in the address, and
 * both need the platform catalogue before they can ask anything: the
 * platform is sent as an identifier rather than as a URL segment, so that
 * renaming a platform cannot break registration as well as every link.
 *
 * Both also warn about what already answers to the name. The warning is
 * shown and never enforced — two Communities may each hold a record for the
 * same in-game Fleet and neither is authoritative — so it is asked for
 * before anything is written, while the registrant can still change their
 * mind, and asked again by the server on the way back, because a preflight
 * answer can be stale by the time a form is sent.
 */
@Directive()
export abstract class ScopeRegisterPageDirective {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _router = inject(Router);
  protected readonly _scopes = inject(FleetScopeService);
  protected readonly _accounts = inject(StoAccountService);
  protected readonly _datePipe = inject(AppDatePipe);
  protected readonly _changeDetector = inject(ChangeDetectorRef);

  /** Set while the registration is in flight, so it cannot be sent twice. */
  isSaving = false;

  /** Set while the duplicate question is in flight. */
  isChecking = false;

  /** What went wrong with the registration, where anything did. */
  errorMessage = '';

  /**
   * What already answers to the name, or null while nobody has asked.
   *
   * An empty array and "not asked" are different: one says nothing else
   * holds the name, the other says nothing has been looked for.
   */
  duplicates: ScopeDuplicateVm[] | null = null;

  /**
   * The Community and the platform catalogue, fetched together.
   *
   * Together rather than in sequence, because neither depends on the other
   * and a form that appeared one field at a time would be a form somebody
   * started filling in before it finished arriving.
   */
  readonly state$: Observable<ScopeRegisterState> = this._route.paramMap.pipe(
    switchMap(params =>
      combineLatest([
        this._scopes.resolveCommunity(params.get('communitySlug') ?? ''),
        this._accounts.getPlatforms(),
      ]).pipe(
        map(([resolved, platforms]): ScopeRegisterState => ({
          kind: 'READY',
          context: { community: resolved.community, platforms },
        })),
        catchError((error: HttpErrorResponse) =>
          of<ScopeRegisterState>(
            error.status === 404
              ? { kind: 'MISSING' }
              : { kind: 'ERROR', message: SCOPE_REGISTER_UNREADABLE },
          ),
        ),
        startWith<ScopeRegisterState>({ kind: 'LOADING' }),
      ),
    ),
  );

  /**
   * Asks what already answers to a name on a platform.
   *
   * @param communityId - The Community being registered into.
   * @param platformId - The platform the registrant picked.
   * @param name - The name they typed, exactly as they typed it.
   */
  onCheckDuplicates(
    communityId: string,
    platformId: string,
    name: string,
  ): void {
    if (name === '' || platformId === '' || this.isChecking) {
      return;
    }

    this.isChecking = true;

    this.findDuplicates(communityId, platformId, name)
      .pipe(
        take(1),
        // A warning that cannot be fetched is reported as no warning rather
        // than as a failure. It is advisory, and refusing to let somebody
        // register because the advice is unavailable would be the wrong way
        // round.
        catchError(() => of<ScopeDuplicateVm[]>([])),
      )
      .subscribe(found => {
        this.duplicates = found;
        this.isChecking = false;
        this._changeDetector.markForCheck();
      });
  }

  /**
   * Asks the server what already answers to the name.
   *
   * @param communityId - The Community being registered into.
   * @param platformId - The platform.
   * @param name - The name being registered.
   * @returns The matches, as the warning draws them.
   */
  protected abstract findDuplicates(
    communityId: string,
    platformId: string,
    name: string,
  ): Observable<ScopeDuplicateVm[]>;

  /**
   * Writes an instant out in the reader's own timezone.
   *
   * @param value - The instant, as the server sent it.
   * @returns The date as the reader would write it.
   */
  protected formatInstant = (value: string): string =>
    this._datePipe.transform(value) ?? value;

  /**
   * Turns a failed registration into something a reader can act on.
   *
   * @param status - The status the server answered with.
   */
  protected reportFailure(status: number | undefined): void {
    this.isSaving = false;

    if (status === 409) {
      this.errorMessage = SCOPE_REGISTER_SLUG_TAKEN;

      return;
    }

    this.errorMessage =
      status === 403 ? SCOPE_REGISTER_FORBIDDEN : SCOPE_REGISTER_FAILED;
  }
}
