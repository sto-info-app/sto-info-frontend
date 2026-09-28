import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { forkJoin, map, Observable } from 'rxjs';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import {
  capabilityNamer,
  describeGovernanceAction,
} from 'src/app/fleet/governance/governance.utils';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the history. */
export const GOVERNANCE_HISTORY_NOT_PERMITTED =
  'How this has been run is for its Owner and Admins to read.';

/** One change, as the page shows it. */
export interface GovernanceHistoryEntry {
  readonly id: string;
  readonly createdAt: string;
  /** What happened, as a sentence. */
  readonly sentence: string;
  /** Why, where anybody said. */
  readonly reason: string | null;
}

/**
 * Who changed how a Community or Fleet is run, and why: the newest fifty
 * changes to its roles, delegations, ownership and closure (FC-022).
 *
 * Capabilities are named as the scope's Delegation page names them, so the
 * roles are read alongside the history.
 */
@Component({
  selector: 'app-governance-history',
  templateUrl: './governance-history.component.html',
  styleUrls: ['./governance-history.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    FleetPageShellComponent,
    ArmadaTabsComponent,
    FleetTabsComponent,
  ],
})
export class GovernanceHistoryComponent extends GovernancePageDirective<
  GovernanceHistoryEntry[]
> {
  private readonly _governance = inject(FleetGovernanceService);

  readonly notPermittedMessage = GOVERNANCE_HISTORY_NOT_PERMITTED;

  /**
   * Reads the history, and names what it mentions.
   *
   * @param scope - The scope.
   * @returns The changes, newest first.
   */
  protected load(
    scope: GovernanceScopeVm,
  ): Observable<GovernanceHistoryEntry[]> {
    return forkJoin({
      history: this._governance.history(scope.target),
      roles: this._governance.roles(scope.target),
    }).pipe(
      map(({ history, roles }) => {
        const nameOf = capabilityNamer(roles.delegable);

        return history.map(entry => ({
          id: entry.id,
          createdAt: entry.createdAt,
          sentence: describeGovernanceAction(entry, nameOf),
          reason: entry.reason,
        }));
      }),
    );
  }
}
