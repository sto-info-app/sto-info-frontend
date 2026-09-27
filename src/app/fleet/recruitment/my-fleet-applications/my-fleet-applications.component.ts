import { AsyncPipe, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  APPLICATION_ROUTE_LABELS,
  APPLICATION_STATUS_LABELS,
  IN_GAME_INVITE_NOTE,
  MEMBERSHIP_ENDED_LINES,
} from 'src/app/fleet/recruitment/recruitment.constants';
import {
  RecruitmentCharacterOption,
  recruitmentCharactersOf,
  recruitmentRefusalOf,
} from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetApplicationStatus,
  MyFleetApplication,
  MyFleetInvitation,
} from 'src/app/models/fleet-recruitment.models';
import { CharacterFleetSummary } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when the page could not be read. */
export const MY_APPLICATIONS_ERROR =
  'Your Fleet applications could not be read. Please try again.';

/** What to say when an action failed for a reason the server did not give. */
export const MY_APPLICATIONS_ACTION_FAILED =
  'That could not be done. Please try again.';

/** What to say once an invitation is accepted. */
export const INVITATION_ACCEPTED = 'You are now a member of that Fleet here.';

/** What to say once an invitation is declined. */
export const INVITATION_DECLINED = 'The invitation is declined.';

/** What to say once an application is withdrawn. */
export const APPLICATION_WITHDRAWN = 'Your application is withdrawn.';

/**
 * What another page hands this one when it sends the reader here, such as
 * the Fleet page once they have left.
 */
export interface MyFleetApplicationsNavigationState {
  /** What to say at the top of the page. */
  readonly notice?: string;
}

/** The reader's applications and invitations, and their Characters. */
export interface MyFleetApplicationsData {
  readonly applications: readonly MyFleetApplication[];
  readonly invitations: readonly MyFleetInvitation[];
  readonly accounts: readonly SwitcherAccount[];
}

/** What the page is showing. */
export type MyFleetApplicationsState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly data: MyFleetApplicationsData };

/**
 * The signed-in person's own Fleet applications and invitations (FC-021).
 *
 * Where a decision reaches an applicant: its status, and the reason a
 * rejection gave. Nothing is sent to them for a routine decision, so this is
 * the page to look at. Invitations waiting for an answer come first, since
 * they lapse; each is accepted with one of the reader's Characters on the
 * Fleet's platform, as a join is.
 */
@Component({
  selector: 'app-my-fleet-applications',
  templateUrl: './my-fleet-applications.component.html',
  styleUrls: ['./my-fleet-applications.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    LcarsErrorMessageComponent,
  ],
})
export class MyFleetApplicationsComponent {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _accounts = inject(StoAccountService);
  private readonly _destroyRef = inject(DestroyRef);

  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly errorMessage = MY_APPLICATIONS_ERROR;
  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly routeLabels = APPLICATION_ROUTE_LABELS;
  readonly inGameNote = IN_GAME_INVITE_NOTE;
  readonly endedLines = MEMBERSHIP_ENDED_LINES;

  /** The Character chosen for each invitation. */
  readonly chosen = signal<Readonly<Record<string, string>>>({});

  /** Whether an action is under way. */
  readonly busy = signal(false);

  /** What the last action came to, if it was refused or failed. */
  readonly actionError = signal<string | null>(null);

  /**
   * What the last action came to, if it was made — or what the page that
   * sent the reader here had to say.
   */
  readonly actionNotice = signal<string | null>(
    (inject(Location).getState() as MyFleetApplicationsNavigationState | null)
      ?.notice ?? null,
  );

  /** The page, read again after each action. */
  readonly state$: Observable<MyFleetApplicationsState> = this._reload$.pipe(
    switchMap(() =>
      forkJoin({
        applications: this._recruitment.myApplications(),
        invitations: this._recruitment.myInvitations(),
        accounts: this._accounts.getSwitcherList(),
      }).pipe(
        map((data): MyFleetApplicationsState => ({ kind: 'READY', data })),
        catchError(() => of<MyFleetApplicationsState>({ kind: 'ERROR' })),
        startWith<MyFleetApplicationsState>({ kind: 'LOADING' }),
      ),
    ),
  );

  /**
   * Where a Fleet's page is.
   *
   * @param fleet - The Fleet.
   * @returns The router link, or null for a Fleet with no Community, which
   *   recruitment never names.
   */
  fleetLink(fleet: CharacterFleetSummary): string[] | null {
    return fleet.communitySlug === null
      ? null
      : FLEET_LINKS.fleet(
          fleet.communitySlug,
          fleet.platformSegment,
          fleet.slug,
        );
  }

  /**
   * The reader's Characters that could accept an invitation.
   *
   * @param data - The page.
   * @param invitation - The invitation.
   * @returns Their Characters on the Fleet's platform.
   */
  charactersFor(
    data: MyFleetApplicationsData,
    invitation: MyFleetInvitation,
  ): RecruitmentCharacterOption[] {
    return recruitmentCharactersOf(
      data.accounts,
      invitation.fleet.platformName,
    );
  }

  /**
   * The Character chosen for an invitation.
   *
   * @param data - The page.
   * @param invitation - The invitation.
   * @returns Its id, the only Character where there is one, or empty.
   */
  chosenFor(
    data: MyFleetApplicationsData,
    invitation: MyFleetInvitation,
  ): string {
    const characters = this.charactersFor(data, invitation);

    return (
      this.chosen()[invitation.id] ??
      (characters.length === 1 ? characters[0].id : '')
    );
  }

  /**
   * Chooses a Character for an invitation.
   *
   * @param invitationId - The invitation.
   * @param characterId - The Character.
   */
  onChoose(invitationId: string, characterId: string): void {
    this.chosen.update(chosen => ({ ...chosen, [invitationId]: characterId }));
  }

  /**
   * Whether an application may still be withdrawn.
   *
   * @param application - The application.
   * @returns True while it waits for a decision.
   */
  isPending(application: MyFleetApplication): boolean {
    return application.status === FleetApplicationStatus.PENDING;
  }

  /**
   * Whether an application made its applicant a member who still is.
   *
   * @param application - The application.
   * @returns True once accepted, until the membership ends.
   */
  isStillMember(application: MyFleetApplication): boolean {
    return (
      application.status === FleetApplicationStatus.ACCEPTED &&
      application.membershipEnded === null
    );
  }

  /**
   * Accepts an invitation with the Character chosen.
   *
   * @param data - The page.
   * @param invitation - The invitation.
   */
  onAccept(data: MyFleetApplicationsData, invitation: MyFleetInvitation): void {
    const characterId = this.chosenFor(data, invitation);

    if (characterId === '') {
      return;
    }

    this.run(
      () =>
        this._recruitment
          .acceptInvitation(invitation.id, characterId)
          .pipe(map(() => undefined)),
      INVITATION_ACCEPTED,
    );
  }

  /**
   * Declines an invitation.
   *
   * @param invitation - The invitation.
   */
  onDecline(invitation: MyFleetInvitation): void {
    this.run(
      () => this._recruitment.declineInvitation(invitation.id),
      INVITATION_DECLINED,
    );
  }

  /**
   * Withdraws an application still waiting.
   *
   * @param application - The application.
   */
  onWithdraw(application: MyFleetApplication): void {
    this.run(
      () =>
        this._recruitment
          .withdrawApplication(application.id)
          .pipe(map(() => undefined)),
      APPLICATION_WITHDRAWN,
    );
  }

  /**
   * Sends one action, then reads the page again.
   *
   * @param work - Makes the request, asked only when none is under way.
   * @param notice - What to say once it is made.
   */
  private run(work: () => Observable<void>, notice: string): void {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.actionError.set(null);
    this.actionNotice.set(null);
    work()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.actionNotice.set(notice);
          this._reload$.next();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.actionError.set(
            recruitmentRefusalOf(error, MY_APPLICATIONS_ACTION_FAILED),
          );
        },
      });
  }
}
