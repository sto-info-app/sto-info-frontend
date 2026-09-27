import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import {
  EFFECT_LABELS,
  GOVERNANCE_REASON_LIMIT,
  UNNAMED_PERSON,
} from 'src/app/fleet/governance/governance.constants';
import { capabilityNamer } from 'src/app/fleet/governance/governance.utils';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  GovernancePerson,
  PersonalCapability,
  ScopeCapabilityEffect,
  ScopeRoles,
} from 'src/app/models/fleet-governance.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the delegations. */
export const GOVERNANCE_DELEGATION_NOT_PERMITTED =
  'What is delegated here is for its Owner and Admins to read.';

/** What to say once the Officers' capabilities are saved. */
export const OFFICERS_SAVED = 'Every Officer here now holds those.';

/** What to say once one person's capability is saved. */
export const PERSONAL_SAVED = 'Saved.';

/** What to say once one person's capability is cleared. */
export const PERSONAL_CLEARED = 'Cleared.';

/** What to say when a change failed for a reason the server did not give. */
export const DELEGATION_FAILED = 'That did not work. Please try again.';

/** The two ways a capability is given to one person, in the order offered. */
export const PERSONAL_EFFECTS: readonly ScopeCapabilityEffect[] = [
  ScopeCapabilityEffect.GRANT,
  ScopeCapabilityEffect.DENY,
];

/**
 * What a Community's or Fleet's Officers and particular people may do there,
 * and, for its Owner, changing it (FC-022).
 *
 * Every Officer holds the same set; one person may be granted a capability
 * besides, or denied one they would otherwise hold, and a denial beats
 * everything. Taking a capability away needs a reason, which is kept:
 * removing one from the Officers, denying one, and clearing a grant. Giving
 * one does not.
 */
@Component({
  selector: 'app-governance-delegation',
  templateUrl: './governance-delegation.component.html',
  styleUrls: ['./governance-delegation.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class GovernanceDelegationComponent extends GovernancePageDirective<ScopeRoles> {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = GOVERNANCE_DELEGATION_NOT_PERMITTED;
  readonly effectLabels = EFFECT_LABELS;
  readonly effects = PERSONAL_EFFECTS;
  readonly reasonLimit = GOVERNANCE_REASON_LIMIT;
  readonly unnamed = UNNAMED_PERSON;
  readonly deny = ScopeCapabilityEffect.DENY;

  /** The Officers' capabilities as ticked, or null while unchanged. */
  readonly officerDraft = signal<readonly string[] | null>(null);

  /** Why any were taken from the Officers. */
  readonly officerReason = signal('');

  /** Whom to grant or deny a capability, by account. */
  readonly personUserId = signal('');

  /** Which capability. */
  readonly personCapability = signal('');

  /** Grant or deny. */
  readonly personEffect = signal<ScopeCapabilityEffect | ''>('');

  /** Why, required for a denial. */
  readonly personReason = signal('');

  /** The grant or denial being cleared, while the reason is asked for. */
  readonly clearing = signal<PersonalCapability | null>(null);

  /** Why it is cleared, required for a grant. */
  readonly clearReason = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

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
   * Names a capability.
   *
   * @param roles - Who governs the scope, with what it offers.
   * @param code - The capability.
   * @returns Its name.
   */
  capabilityName(roles: ScopeRoles, code: string): string {
    return capabilityNamer(roles.delegable)(code);
  }

  /**
   * The Officers' capabilities as they are ticked now.
   *
   * @param roles - Who governs the scope.
   * @returns The codes.
   */
  officerSelection(roles: ScopeRoles): readonly string[] {
    return this.officerDraft() ?? roles.officerCapabilities;
  }

  /**
   * Ticks or unticks a capability for the Officers.
   *
   * @param roles - Who governs the scope.
   * @param code - The capability.
   * @param held - Whether it is now ticked.
   */
  onToggleOfficer(roles: ScopeRoles, code: string, held: boolean): void {
    const others = this.officerSelection(roles).filter(entry => entry !== code);

    this.officerDraft.set(held ? [...others, code] : others);
  }

  /**
   * Whether the ticks differ from what is saved.
   *
   * @param roles - Who governs the scope.
   * @returns True when there is something to save.
   */
  officersChanged(roles: ScopeRoles): boolean {
    const selection = this.officerSelection(roles);

    return (
      this.officersLosing(roles) ||
      selection.some(code => !roles.officerCapabilities.includes(code))
    );
  }

  /**
   * Whether saving would take a capability from the Officers, which needs a
   * reason.
   *
   * @param roles - Who governs the scope.
   * @returns True when any is unticked.
   */
  officersLosing(roles: ScopeRoles): boolean {
    const selection = this.officerSelection(roles);

    return roles.officerCapabilities.some(code => !selection.includes(code));
  }

  /**
   * Saves the Officers' capabilities as ticked.
   *
   * @param scope - The scope.
   * @param roles - Who governs it.
   */
  onSaveOfficers(scope: GovernanceScopeVm, roles: ScopeRoles): void {
    const reason = this.officerReason().trim();
    const losing = this.officersLosing(roles);

    if (
      !this.officersChanged(roles) ||
      (losing && reason === '') ||
      this.busy()
    ) {
      return;
    }

    this.run(
      this._governance.setOfficerCapabilities(
        scope.target,
        this.officerSelection(roles),
        losing ? reason : undefined,
      ),
      OFFICERS_SAVED,
      () => {
        this.officerDraft.set(null);
        this.officerReason.set('');
      },
    );
  }

  /** Puts the ticks back as saved. */
  onResetOfficers(): void {
    this.officerDraft.set(null);
    this.officerReason.set('');
  }

  /**
   * Whom a capability may be granted or denied: role holders and members,
   * never the Owner, who holds everything.
   *
   * @param roles - Who governs the scope.
   * @returns The people to offer, each once.
   */
  people(roles: ScopeRoles): GovernancePerson[] {
    const seen = new Set([roles.owner.userId]);
    const people: GovernancePerson[] = [];

    for (const person of [...roles.holders, ...roles.candidates]) {
      if (!seen.has(person.userId)) {
        seen.add(person.userId);
        people.push({ userId: person.userId, username: person.username });
      }
    }

    return people;
  }

  /**
   * Whether the grant-or-deny form may be sent.
   *
   * @returns True once everything it needs is given.
   */
  personReady(): boolean {
    return (
      this.personUserId() !== '' &&
      this.personCapability() !== '' &&
      this.personEffect() !== '' &&
      (this.personEffect() !== ScopeCapabilityEffect.DENY ||
        this.personReason().trim() !== '')
    );
  }

  /**
   * Grants or denies the capability chosen. Pressing Enter submits the form
   * whatever the button says, so this checks again.
   *
   * @param scope - The scope.
   */
  onSetPersonal(scope: GovernanceScopeVm): void {
    const effect = this.personEffect();
    const reason = this.personReason().trim();

    if (effect === '' || !this.personReady() || this.busy()) {
      return;
    }

    this.run(
      this._governance.setPersonal(scope.target, {
        userId: this.personUserId(),
        capability: this.personCapability(),
        effect,
        ...(reason ? { reason } : {}),
      }),
      PERSONAL_SAVED,
      () => {
        this.personUserId.set('');
        this.personCapability.set('');
        this.personEffect.set('');
        this.personReason.set('');
      },
    );
  }

  /**
   * Asks about clearing one person's grant or denial.
   *
   * @param entry - The grant or denial.
   */
  onClear(entry: PersonalCapability): void {
    this.clearing.set(entry);
    this.clearReason.set('');
    this.notice.set(null);
    this.error.set(null);
  }

  /** Thinks better of clearing it. */
  onKeep(): void {
    this.clearing.set(null);
    this.clearReason.set('');
  }

  /**
   * Whether the clearing asked about may go ahead.
   *
   * @param entry - The grant or denial.
   * @returns True unless it is a grant with no reason given.
   */
  clearReady(entry: PersonalCapability): boolean {
    return (
      entry.effect !== ScopeCapabilityEffect.GRANT ||
      this.clearReason().trim() !== ''
    );
  }

  /**
   * Clears the grant or denial being asked about.
   *
   * @param scope - The scope.
   */
  onConfirmClear(scope: GovernanceScopeVm): void {
    const entry = this.clearing();
    const reason = this.clearReason().trim();

    if (entry === null || !this.clearReady(entry) || this.busy()) {
      return;
    }

    this.run(
      this._governance.clearPersonal(
        scope.target,
        entry.grantId,
        reason || undefined,
      ),
      PERSONAL_CLEARED,
      () => this.onKeep(),
    );
  }

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
  private run(change: Observable<void>, done: string, reset: () => void): void {
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
        this.error.set(recruitmentRefusalOf(error, DELEGATION_FAILED));
      },
    });
  }
}
