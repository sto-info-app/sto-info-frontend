import { DestroyRef, Directive, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Observable } from 'rxjs';

import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import { ScopeRoles } from 'src/app/models/fleet-governance.models';

/**
 * The half of the Roles and Delegation pages that is the same for both
 * (FC-022).
 *
 * Both read who governs a scope, with what it delegates, and both change it
 * one request at a time: while a change is under way nothing else is sent,
 * and once it is made the form it came from is cleared and the page is read
 * again, so it shows what the server now holds.
 */
@Directive()
export abstract class ScopeRolesPageDirective extends GovernancePageDirective<ScopeRoles> {
  protected readonly _governance = inject(FleetGovernanceService);
  protected readonly _destroyRef = inject(DestroyRef);

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /** What to say when a change failed for a reason the server did not give. */
  protected abstract readonly _changeFailed: string;

  /**
   * Reads who governs the scope, with what it delegates.
   *
   * @param scope - The scope.
   * @returns Its roles.
   */
  protected load(scope: GovernanceScopeVm): Observable<ScopeRoles> {
    return this._governance.roles(scope.target);
  }

  /**
   * Makes one change, then reads the page again.
   *
   * @param change - The request.
   * @param done - What to say when it is made.
   * @param reset - Clears the form it came from.
   */
  protected run(
    change: Observable<void>,
    done: string,
    reset: () => void,
  ): void {
    this.busy.set(true);
    this.notice.set(null);
    this.error.set(null);
    change.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        reset();
        this.notice.set(done);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(recruitmentRefusalOf(error, this._changeFailed));
      },
    });
  }
}
