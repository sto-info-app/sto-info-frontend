import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';

import { catchError, map, Observable, of, take } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import { MyFleetApplicationsNavigationState } from 'src/app/fleet/recruitment/my-fleet-applications/my-fleet-applications.component';
import { IN_GAME_INVITE_NOTE } from 'src/app/fleet/recruitment/recruitment.constants';
import {
  RecruitmentCharacterOption,
  recruitmentCharactersOf,
  recruitmentRefusalOf,
} from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetRecruitmentView,
  RecruitmentSettings,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What the panel needs to know about the Fleet it sits on. */
export interface FleetRecruitmentPanelVm {
  readonly communityId: string;
  readonly fleetId: string;
  /** The Fleet's name, exactly as recorded. */
  readonly fleetName: string;
  /** The Fleet's platform, which a Character must play on. */
  readonly platformName: string;
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly fleetSlug: string;
}

/** How each recruitment state reads to somebody deciding whether to ask. */
export const RECRUITMENT_STATE_SUMMARIES: Record<
  FleetRecruitmentState,
  string
> = {
  [FleetRecruitmentState.OPEN]:
    'Open: anybody who meets the requirements may join.',
  [FleetRecruitmentState.APPLICATION]:
    'Taking applications: the Fleet’s officers decide each one.',
  [FleetRecruitmentState.INVITE_ONLY]: 'By invitation only.',
  [FleetRecruitmentState.CLOSED]: 'Not recruiting.',
};

/** What to say when how the Fleet recruits could not be read. */
export const RECRUITMENT_PANEL_ERROR =
  'How this Fleet recruits could not be read. Please try again later.';

/** What to say when the reader's Characters could not be read. */
export const RECRUITMENT_CHARACTERS_ERROR =
  'Your Characters could not be read. Please try again.';

/** What to say when a join, acceptance, decline or departure fails. */
export const RECRUITMENT_ACTION_ERROR =
  'That could not be done. Please try again.';

/**
 * How a Fleet recruits, and what the reader may do about it (FC-021).
 *
 * On the Fleet's own page, beneath the follow control. It reads its own
 * answer rather than arriving with the page, because where the reader
 * stands — a pending application, an open invitation — is recruitment's to
 * say and changes as they act.
 *
 * Joining happens here, with a Character chosen from the reader's own on
 * the Fleet's platform; applying has a page of its own, because it has a
 * form. An open invitation is accepted here the same way a join is made.
 * Whatever the reader does, the page is read again afterwards, since their
 * membership, and so the sections they are offered, may have changed — except
 * leaving, which takes them to their own applications instead: a Fleet only
 * its Community can see is gone from them the moment they leave it.
 */
@Component({
  selector: 'app-fleet-recruitment-panel',
  templateUrl: './fleet-recruitment-panel.component.html',
  styleUrls: ['./fleet-recruitment-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, FormsModule, RouterLink],
})
export class FleetRecruitmentPanelComponent {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _accounts = inject(StoAccountService);
  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);

  private _vm!: FleetRecruitmentPanelVm;

  readonly inGameNote = IN_GAME_INVITE_NOTE;
  readonly loadError = RECRUITMENT_PANEL_ERROR;
  readonly charactersError = RECRUITMENT_CHARACTERS_ERROR;
  readonly summaries = RECRUITMENT_STATE_SUMMARIES;
  readonly myApplicationsLink = FLEET_LINKS.myApplications();

  /** How the Fleet recruits and where the reader stands, once read. */
  protected view = signal<FleetRecruitmentView | null>(null);

  /** Set when the view could not be read. */
  protected loadFailed = signal(false);

  /**
   * The reader's Characters on the Fleet's platform, once read; null until
   * then, and while nothing on the panel needs them.
   */
  protected characters = signal<RecruitmentCharacterOption[] | null>(null);

  /** Set when the Characters could not be read. */
  protected charactersFailed = signal(false);

  /** The Character chosen to join or accept with. */
  protected characterId = signal<string>('');

  /** Set while a request is in flight. */
  protected busy = signal(false);

  /** What went wrong, where anything did. */
  protected errorMessage = signal<string | null>(null);

  /**
   * Raised once the reader has joined, accepted or declined, so the page
   * reads their standing and sections again.
   */
  @Output() readonly changed = new EventEmitter<void>();

  /** The Fleet. Reads how it recruits whenever it changes. */
  @Input({ required: true }) set vm(value: FleetRecruitmentPanelVm) {
    this._vm = value;
    this.view.set(null);
    this.loadFailed.set(false);
    this.characters.set(null);
    this.charactersFailed.set(false);
    this.characterId.set('');
    this.errorMessage.set(null);
    this.busy.set(false);
    this.load();
  }

  get vm(): FleetRecruitmentPanelVm {
    return this._vm;
  }

  /** Whether the reader is a member now. */
  readonly isMember = computed(
    () =>
      this.view()?.viewer?.membershipStatus === ScopeMembershipStatus.APPROVED,
  );

  /**
   * Whether the reader is somebody recruitment could still bring in: signed
   * in, not the Owner, and neither a member nor suspended.
   */
  readonly isOutsider = computed(() => {
    const viewer = this.view()?.viewer;

    return (
      !!viewer &&
      !viewer.isOwner &&
      viewer.membershipStatus !== ScopeMembershipStatus.APPROVED &&
      viewer.membershipStatus !== ScopeMembershipStatus.SUSPENDED
    );
  });

  /** Whether the reader may join straight away. */
  readonly mayJoin = computed(
    () =>
      this.isOutsider() &&
      this.view()?.settings.recruitmentState === FleetRecruitmentState.OPEN &&
      !this.view()?.viewer?.openInvitation,
  );

  /** Whether the reader may apply. */
  readonly mayApply = computed(
    () =>
      this.isOutsider() &&
      this.view()?.settings.recruitmentState ===
        FleetRecruitmentState.APPLICATION &&
      !this.view()?.viewer?.openInvitation,
  );

  /** Whether the Fleet states requirements worth listing. */
  readonly showsRequirements = computed(() => {
    const settings = this.view()?.settings;

    return (
      !!settings &&
      (settings.recruitmentState === FleetRecruitmentState.OPEN ||
        settings.recruitmentState === FleetRecruitmentState.APPLICATION) &&
      (settings.minimumLevel !== null ||
        settings.factions.length > 0 ||
        !!settings.requirementsText)
    );
  });

  /**
   * The allowed factions, named in a list.
   *
   * @param settings - How the Fleet recruits.
   * @returns The names, comma-separated.
   */
  factionListOf(settings: RecruitmentSettings): string {
    return settings.factions.map(faction => faction.name).join(', ');
  }

  /** The page applying to the Fleet happens on. */
  protected get applyLink(): string[] {
    return FLEET_LINKS.fleetApply(
      this.vm.communitySlug,
      this.vm.platformSegment,
      this.vm.fleetSlug,
    );
  }

  /** Joins with the chosen Character. */
  protected join(): void {
    const characterId = this.characterId();

    if (characterId === '' || this.busy()) {
      return;
    }

    this.run(
      this._recruitment
        .join(this.vm.communityId, this.vm.fleetId, characterId)
        .pipe(map(() => undefined)),
    );
  }

  /** Accepts the open invitation with the chosen Character. */
  protected accept(): void {
    const invitation = this.view()?.viewer?.openInvitation;
    const characterId = this.characterId();

    if (!invitation || characterId === '' || this.busy()) {
      return;
    }

    this.run(
      this._recruitment
        .acceptInvitation(invitation.id, characterId)
        .pipe(map(() => undefined)),
    );
  }

  /** Declines the open invitation. */
  protected decline(): void {
    const invitation = this.view()?.viewer?.openInvitation;

    if (!invitation || this.busy()) {
      return;
    }

    this.run(this._recruitment.declineInvitation(invitation.id));
  }

  /** Leaves the Fleet, once confirmed. */
  protected leave(): void {
    if (this.busy()) {
      return;
    }

    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Leave this Fleet?',
          message:
            `You will no longer be a member of ${this.vm.fleetName.trim()} ` +
            'here, and any role you hold at it ends. This does not take you ' +
            'out of the Fleet in game.',
          confirmText: 'Leave',
          cancelText: 'Stay',
        },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(confirmed => {
        if (confirmed) {
          this.run(
            this._recruitment.leave(this.vm.communityId, this.vm.fleetId),
            () => this.afterLeaving(),
          );
        }
      });
  }

  /**
   * Picks a Character from the list.
   *
   * @param characterId - The Character chosen.
   */
  protected choose(characterId: string): void {
    this.characterId.set(characterId);
  }

  /** Reads how the Fleet recruits, then the Characters if they are needed. */
  private load(): void {
    const { communityId, fleetId } = this._vm;

    this._recruitment
      .view(communityId, fleetId)
      .pipe(catchError(() => of(null)))
      .subscribe(view => {
        // A later Fleet has replaced this one; its own read will answer.
        if (this._vm.fleetId !== fleetId) {
          return;
        }

        if (view === null) {
          this.loadFailed.set(true);

          return;
        }

        this.view.set(view);

        if (this.mayJoin() || view.viewer?.openInvitation) {
          this.loadCharacters();
        }
      });
  }

  /** Reads the reader's Characters on the Fleet's platform. */
  private loadCharacters(): void {
    const platformName = this._vm.platformName;

    this._accounts
      .getSwitcherList()
      .pipe(
        map(accounts => recruitmentCharactersOf(accounts, platformName)),
        catchError(() => of(null)),
      )
      .subscribe(characters => {
        if (characters === null) {
          this.charactersFailed.set(true);

          return;
        }

        this.characters.set(characters);

        if (characters.length === 1) {
          this.characterId.set(characters[0].id);
        }
      });
  }

  /** Takes somebody who has just left to their own applications. */
  private afterLeaving(): void {
    const state: MyFleetApplicationsNavigationState = {
      notice: `You have left ${this.vm.fleetName.trim()}.`,
    };

    void this._router.navigate(FLEET_LINKS.myApplications(), { state });
  }

  /**
   * Sends one change, then does what follows it.
   *
   * @param work - The request.
   * @param done - What follows; by default, the page reads itself again.
   */
  private run(
    work: Observable<void>,
    done: () => void = () => this.changed.emit(),
  ): void {
    this.busy.set(true);
    this.errorMessage.set(null);

    work.subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(
          recruitmentRefusalOf(error, RECRUITMENT_ACTION_ERROR),
        );
      },
    });
  }
}
