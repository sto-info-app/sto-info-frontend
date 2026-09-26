import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  APPLICATION_ROUTE_LABELS,
  MEMBERS_MANAGE_CAPABILITY,
  MEMBERSHIP_STATUS_LABELS,
  RECRUITMENT_LIMITS,
} from 'src/app/fleet/recruitment/recruitment.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import { FleetMember } from 'src/app/models/fleet-recruitment.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not manage the members. */
export const FLEET_MEMBERS_NOT_PERMITTED =
  'Managing this Fleet’s members is for whoever the Owner trusts with it.';

/** What to say once somebody is removed. */
export const MEMBER_REMOVED = 'They are no longer a member here.';

/** What to say when a removal failed for a reason the server did not give. */
export const MEMBER_REMOVAL_FAILED =
  'They could not be removed. Please try again.';

/** A Fleet's members, and the Fleet. */
export interface FleetMembersData {
  readonly section: FleetSection;
  readonly members: readonly FleetMember[];
}

/**
 * A Fleet's members here, for whoever holds `members.manage` (FC-021).
 *
 * Membership here is what opens the Fleet's private pages; it is not the
 * game's roster, which the Roster tab shows. Removing somebody needs a
 * reason, which is kept, and ends any role they hold at the Fleet. The
 * server refuses to remove a role holder or the remover themselves, and
 * says which.
 */
@Component({
  selector: 'app-fleet-members',
  templateUrl: './fleet-members.component.html',
  styleUrls: ['./fleet-members.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetMembersComponent extends FleetSectionPageDirective<FleetMembersData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_MEMBERS_NOT_PERMITTED;
  readonly statusLabels = MEMBERSHIP_STATUS_LABELS;
  readonly routeLabels = APPLICATION_ROUTE_LABELS;
  readonly reasonLimit = RECRUITMENT_LIMITS.REMOVAL_REASON;

  protected readonly _requiredCapabilities = [MEMBERS_MANAGE_CAPABILITY];

  protected override readonly _needsRoster = false;

  /** The member being removed, while the reason is asked for. */
  readonly removing = signal<FleetMember | null>(null);

  /** The reason typed. */
  readonly reason = signal('');

  /** Whether a removal is under way. */
  readonly busy = signal(false);

  /** What the last removal came to, if it was refused or failed. */
  readonly removalError = signal<string | null>(null);

  /** What the last removal came to, if it was made. */
  readonly removalNotice = signal<string | null>(null);

  /**
   * Asks for the reason to remove somebody.
   *
   * @param member - The member.
   */
  onRemove(member: FleetMember): void {
    this.removing.set(member);
    this.reason.set('');
    this.removalError.set(null);
    this.removalNotice.set(null);
  }

  /** Thinks better of a removal. */
  onCancel(): void {
    this.removing.set(null);
    this.reason.set('');
  }

  /**
   * Removes the member being asked about, with the reason typed. Pressing
   * Enter submits the form whatever the button says, so this checks again.
   *
   * @param data - The page.
   */
  onConfirm(data: FleetMembersData): void {
    const member = this.removing();
    const reason = this.reason().trim();

    if (member === null || reason === '' || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.removalError.set(null);
    this._recruitment
      .removeMember(
        data.section.communityId,
        data.section.fleetId,
        member.membershipId,
        reason,
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.removing.set(null);
          this.reason.set('');
          this.removalNotice.set(MEMBER_REMOVED);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.removalError.set(
            recruitmentRefusalOf(error, MEMBER_REMOVAL_FAILED),
          );
        },
      });
  }

  /**
   * Reads the Fleet's members.
   *
   * @param section - The Fleet.
   * @returns The members, with the Fleet.
   */
  protected load(section: FleetSection): Observable<FleetMembersData> {
    return this._recruitment
      .members(section.communityId, section.fleetId)
      .pipe(map(members => ({ section, members })));
  }
}
