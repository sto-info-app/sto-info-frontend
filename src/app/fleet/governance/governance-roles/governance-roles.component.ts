import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetBackLinkComponent } from 'src/app/fleet/components/fleet-back-link/fleet-back-link.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import {
  GOVERNANCE_REASON_LIMIT,
  ROLE_LABELS,
  UNNAMED_PERSON,
} from 'src/app/fleet/governance/governance.constants';
import {
  AppointableRole,
  FleetScopeRole,
  GovernancePerson,
  ScopeRoleHolder,
  ScopeRoles,
} from 'src/app/models/fleet-governance.models';
import { ScopeRolesPageDirective } from 'src/app/fleet/governance/scope-roles-page.directive';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read who holds a role. */
export const GOVERNANCE_ROLES_NOT_PERMITTED =
  'Who holds a role here is for its Owner and Admins to read.';

/** What to say once somebody is appointed. */
export const ROLE_APPOINTED = 'Appointed.';

/** What to say once a role is withdrawn. */
export const ROLE_WITHDRAWN = 'The role is withdrawn.';

/** What to say when a change failed for a reason the server did not give. */
export const ROLE_CHANGE_FAILED = 'That did not work. Please try again.';

/** The roles an Owner appoints, in the order they are offered. */
export const APPOINTABLE_ROLES: readonly AppointableRole[] = [
  FleetScopeRole.ADMIN,
  FleetScopeRole.OFFICER,
];

/**
 * Who holds a role at a Community or Fleet, and, for its Owner, appointing
 * and withdrawing them (FC-022).
 *
 * Admins read it; only the Owner changes it. Anybody is appointed from the
 * scope's members, one role each: somebody who holds one is not offered
 * again until it is withdrawn. Withdrawing needs a reason, which is kept.
 */
@Component({
  selector: 'app-governance-roles',
  templateUrl: './governance-roles.component.html',
  styleUrls: ['./governance-roles.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDatePipe,
    ArmadaTabsComponent,
    AsyncPipe,
    CollapsibleSectionComponent,
    FleetBackLinkComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class GovernanceRolesComponent extends ScopeRolesPageDirective {
  protected readonly _changeFailed = ROLE_CHANGE_FAILED;

  readonly notPermittedMessage = GOVERNANCE_ROLES_NOT_PERMITTED;
  readonly roleLabels = ROLE_LABELS;
  readonly appointableRoles = APPOINTABLE_ROLES;
  readonly reasonLimit = GOVERNANCE_REASON_LIMIT;
  readonly unnamed = UNNAMED_PERSON;

  /** Whom to appoint, by account. */
  readonly appointee = signal('');

  /** Which role to give them. */
  readonly appointRole = signal<AppointableRole | ''>('');

  /** Why, if the Owner says. */
  readonly appointReason = signal('');

  /** The role being withdrawn, while the reason is asked for. */
  readonly withdrawing = signal<ScopeRoleHolder | null>(null);

  /** Why it is withdrawn. */
  readonly withdrawReason = signal('');

  /**
   * Whether the reader may change anything here.
   *
   * @param scope - The scope.
   * @param roles - Who governs it.
   * @returns True for the Owner of a scope still open.
   */
  mayChange(scope: GovernanceScopeVm, roles: ScopeRoles): boolean {
    return roles.mayManage && !scope.isClosed;
  }

  /**
   * Whom the Owner may appoint: members holding no role here yet.
   *
   * @param roles - Who governs the scope.
   * @returns The people to offer.
   */
  appointable(roles: ScopeRoles): GovernancePerson[] {
    const holding = new Set(roles.holders.map(holder => holder.userId));

    return roles.candidates.filter(
      person =>
        !holding.has(person.userId) && person.userId !== roles.owner?.userId,
    );
  }

  /**
   * Appoints whoever was chosen. Pressing Enter submits the form whatever the
   * button says, so this checks again.
   *
   * @param scope - The scope.
   */
  onAppoint(scope: GovernanceScopeVm): void {
    const userId = this.appointee();
    const role = this.appointRole();
    const reason = this.appointReason().trim();

    if (userId === '' || role === '' || this.busy()) {
      return;
    }

    this.run(
      this._governance.assign(scope.target, {
        userId,
        role,
        ...(reason ? { reason } : {}),
      }),
      ROLE_APPOINTED,
      () => {
        this.appointee.set('');
        this.appointRole.set('');
        this.appointReason.set('');
      },
    );
  }

  /**
   * Asks for the reason to withdraw a role.
   *
   * @param holder - The role held.
   */
  onWithdraw(holder: ScopeRoleHolder): void {
    this.withdrawing.set(holder);
    this.withdrawReason.set('');
    this.notice.set(null);
    this.error.set(null);
  }

  /** Thinks better of a withdrawal. */
  onKeep(): void {
    this.withdrawing.set(null);
    this.withdrawReason.set('');
  }

  /**
   * Withdraws the role being asked about, with the reason typed.
   *
   * @param scope - The scope.
   */
  onConfirmWithdraw(scope: GovernanceScopeVm): void {
    const holder = this.withdrawing();
    const reason = this.withdrawReason().trim();

    if (holder === null || reason === '' || this.busy()) {
      return;
    }

    this.run(
      this._governance.withdraw(scope.target, holder.assignmentId, reason),
      ROLE_WITHDRAWN,
      () => this.onKeep(),
    );
  }
}
