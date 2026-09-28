import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import { filter, Observable, of, switchMap } from 'rxjs';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernanceCloseDialogComponent,
  GovernanceCloseDialogData,
  GovernanceCloseDialogResult,
} from 'src/app/fleet/governance/governance-close-dialog/governance-close-dialog.component';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import {
  GOVERNANCE_READER_ROLES,
  SCOPE_CLOSE_CAPABILITY,
} from 'src/app/fleet/governance/governance.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import { FleetScopeAction } from 'src/app/fleet/scope/fleet-scope-page.models';
import { FleetScopeRole } from 'src/app/models/fleet-governance.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';

/** What to say to somebody with no part in running the scope. */
export const GOVERNANCE_HUB_NOT_PERMITTED =
  'Managing this is for its Owner and Admins.';

/** What to say once it is closed. */
export const GOVERNANCE_CLOSED = 'It is closed. Every role here has ended.';

/** What to say when closing failed for a reason the server did not give. */
export const GOVERNANCE_CLOSE_FAILED =
  'It could not be closed. Please try again.';

/** What the hub offers. */
export interface GovernanceHubData {
  /** The pages the reader may open, in the order they are offered. */
  readonly actions: readonly FleetScopeAction[];
  /** Whether the reader may close the scope from here. */
  readonly mayClose: boolean;
}

/**
 * Where a Community's or Fleet's Owner runs it, and its Admins read how it is
 * run (FC-022).
 *
 * A hub, as Recruitment is: roles, delegation and history are pages of their
 * own, and a Community adds its ownership. A site administrator reaches a
 * Community's dispute page from here, whether or not they hold a role in it.
 * Closing sits at the foot, for the Owner alone, behind a dialog that asks
 * for the name and a reason.
 */
@Component({
  selector: 'app-governance-hub',
  templateUrl: './governance-hub.component.html',
  styleUrls: ['./governance-hub.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    FleetPageShellComponent,
    ArmadaTabsComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class GovernanceHubComponent extends GovernancePageDirective<GovernanceHubData> {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = GOVERNANCE_HUB_NOT_PERMITTED;

  /** Whether a closure is under way. */
  readonly busy = signal(false);

  /** What the last closure came to, if it was made. */
  readonly closeNotice = signal<string | null>(null);

  /** What the last closure came to, if it was refused or failed. */
  readonly closeError = signal<string | null>(null);

  /**
   * Asks for the name and a reason, then closes the scope.
   *
   * @param scope - The scope.
   */
  onClose(scope: GovernanceScopeVm): void {
    this._dialog
      .open<
        GovernanceCloseDialogComponent,
        GovernanceCloseDialogData,
        GovernanceCloseDialogResult
      >(GovernanceCloseDialogComponent, {
        width: '75%',
        data: {
          scopeNoun: scope.isCommunity ? 'Community' : 'Fleet',
          name: scope.name,
          asSiteAdmin: false,
        },
      })
      .afterClosed()
      .pipe(
        filter(
          (result): result is GovernanceCloseDialogResult =>
            result !== undefined,
        ),
        switchMap(({ reason }) => {
          this.busy.set(true);
          this.closeNotice.set(null);
          this.closeError.set(null);

          return this._governance.close(scope.target, reason);
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.closeNotice.set(GOVERNANCE_CLOSED);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.closeError.set(
            recruitmentRefusalOf(error, GOVERNANCE_CLOSE_FAILED),
          );
        },
      });
  }

  /**
   * Opens to the Owner and Admins, and to a site administrator on a
   * Community, who comes for its dispute page.
   *
   * @param scope - The scope.
   * @returns True when they may.
   */
  protected override mayOpen(scope: GovernanceScopeVm): boolean {
    return super.mayOpen(scope) || (scope.isCommunity && scope.isSiteAdmin);
  }

  /**
   * Works out what the reader may go and do.
   *
   * @param scope - The scope.
   * @returns The pages they may open, and whether they may close it.
   */
  protected load(scope: GovernanceScopeVm): Observable<GovernanceHubData> {
    const { manageLink, name } = scope;
    const isOwner = scope.roles.includes(FleetScopeRole.OWNER);
    // A closed scope is read, not changed, whoever reads it.
    const changes = isOwner && !scope.isClosed;
    const actions: FleetScopeAction[] = [];

    if (scope.roles.some(role => GOVERNANCE_READER_ROLES.includes(role))) {
      actions.push(
        {
          label: 'Roles',
          link: [...manageLink, 'roles'],
          description: changes
            ? `Appoint ${name}’s Admins and Officers, and withdraw a role.`
            : `See who holds a role in ${name}.`,
        },
        {
          label: 'Delegation',
          link: [...manageLink, 'delegation'],
          description: changes
            ? 'Choose what every Officer may do, and grant or deny one ' +
              'person a capability.'
            : 'See what Officers and particular people may do here.',
        },
        {
          label: 'History',
          link: [...manageLink, 'history'],
          description: `Read who changed how ${name} is run, and why.`,
        },
      );
    }

    if (scope.isCommunity && isOwner) {
      actions.push({
        label: 'Ownership',
        link: [...manageLink, 'ownership'],
        description: `Offer ${name} to one of its Admins.`,
      });
    }

    if (scope.isCommunity && scope.isSiteAdmin) {
      actions.push({
        label: 'Site administration',
        link: [...manageLink, 'dispute'],
        description:
          'Move ownership to one of its Admins, or close it, when its ' +
          'ownership is disputed.',
      });
    }

    return of({
      actions,
      // An Armada closes through its own route, not from here (FC-025).
      mayClose:
        !scope.isArmada &&
        !scope.isClosed &&
        scope.capabilities.includes(SCOPE_CLOSE_CAPABILITY),
    });
  }
}
