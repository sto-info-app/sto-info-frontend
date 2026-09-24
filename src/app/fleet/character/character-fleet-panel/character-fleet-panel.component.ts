import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Observable, catchError, of } from 'rxjs';

import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import {
  CharacterFleetMembership,
  CharacterFleetProposal,
  CharacterFleetProposalState,
  FleetAudience,
  StoFleetCard,
} from 'src/app/models/fleet.models';

import {
  FLEET_AUDIENCE_CHOICES,
  FLEET_AUDIENCE_LABELS,
} from '../../constants/fleet-scope.constants';
import { CharacterFleetService } from '../../character-fleet.service';
import { FLEET_LINKS } from '../../fleet-links';
import { FleetDirectoryService } from '../../fleet-directory.service';

/** How many Fleets the picker offers at once. */
const PICKER_RESULTS = 8;

/** What each source is called where a history entry says where it came from. */
export const CHARACTER_FLEET_SOURCE_LABELS: Readonly<Record<string, string>> = {
  MANUAL: 'You recorded this',
  APPLICATION: 'From an approved application',
  CONFIRMED_IMPORT: 'You confirmed this from a Fleet roster',
};

/**
 * What a user says about one Character's Fleet, on the Character's own page.
 *
 * It belongs here rather than on a Fleet's page because it is the owner's
 * record about their own Character — the middle of ADR-0002's three facts, and
 * the only one they control outright. A Fleet's page says what the Fleet is; a
 * Character's page is where somebody answers what their Character is doing.
 *
 * ## Everything starts private
 *
 * Recording a Fleet must not publish it, so the form opens on "Only me" and
 * widening is a deliberate act on a row at a time. That per-row choice matters:
 * somebody may well want the Fleet they are in now to be visible and the one
 * before it to be nobody's business.
 *
 * ## Two ways to remove, and the difference is the point
 *
 * "I have left" closes the entry and keeps it, because leaving a Fleet is a
 * fact with a date on it. "Remove" takes it out of the history, for the entry
 * that should never have been recorded. A single button for both would make
 * one of the two impossible to say.
 *
 * ## Proposals are answered one at a time
 *
 * Two Fleets may be asking at once, and accepting one leaves the other where
 * it is. A Character genuinely may have been in both at different times, and
 * tidying the rest away would be the site deciding which Fleet somebody is in.
 */
@Component({
  selector: 'app-character-fleet-panel',
  templateUrl: './character-fleet-panel.component.html',
  styleUrls: ['./character-fleet-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
  providers: [AppDatePipe],
})
export class CharacterFleetPanelComponent implements OnInit {
  /** The Character this panel is about. */
  @Input({ required: true }) characterId!: string;

  private readonly _service = inject(CharacterFleetService);
  private readonly _directory = inject(FleetDirectoryService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _datePipe = inject(AppDatePipe);

  /** Whether the first read is still in flight. */
  protected loading = signal(true);

  /** What went wrong, where something did. */
  protected errorMessage = signal<string | null>(null);

  /** Whether a write is in flight, which disables every button. */
  protected busy = signal(false);

  /** The Character's own history, newest first. */
  protected memberships = signal<CharacterFleetMembership[]>([]);

  /** Every proposal raised about the Character. */
  protected proposals = signal<CharacterFleetProposal[]>([]);

  /** Whether the "record a Fleet" form is open. */
  protected recording = signal(false);

  /** What the Fleet search last returned. */
  protected pickerResults = signal<StoFleetCard[]>([]);

  /** Whether the picker has been asked and answered with nothing. */
  protected pickerSearched = signal(false);

  /** The Fleet the owner has picked, which the form records against. */
  protected pickedFleet = signal<StoFleetCard | null>(null);

  /** The one that has not ended, where there is one. */
  protected current = computed(
    () => this.memberships().find(entry => entry.validTo === null) ?? null,
  );

  /** Everything that has ended, which is the history proper. */
  protected past = computed(() =>
    this.memberships().filter(entry => entry.validTo !== null),
  );

  /** The proposals still worth putting in front of somebody. */
  protected pending = computed(() =>
    this.proposals().filter(
      proposal => proposal.state === CharacterFleetProposalState.PENDING,
    ),
  );

  /** How each audience is offered on the form. */
  protected audienceChoices = Object.entries(FLEET_AUDIENCE_CHOICES);

  /** The search box, and what the picked Fleet is recorded as. */
  protected form = this._formBuilder.nonNullable.group({
    search: [''],
    validFrom: ['', Validators.required],
    visibility: [FleetAudience.PRIVATE],
  });

  /**
   * Reads the history and the proposals.
   */
  ngOnInit(): void {
    this.reload();
  }

  /**
   * Reads both lists again, after a write or on first load.
   */
  protected reload(): void {
    this.loading.set(true);
    this._service
      .history(this.characterId)
      .pipe(catchError(() => of(null)))
      .subscribe(memberships => {
        if (memberships === null) {
          this.errorMessage.set(
            'The Fleet record for this Character could not be read.',
          );
          this.loading.set(false);

          return;
        }

        this.memberships.set(memberships);
        this._service
          .proposals(this.characterId)
          .pipe(catchError(() => of([] as CharacterFleetProposal[])))
          .subscribe(proposals => {
            this.proposals.set(proposals);
            this.loading.set(false);
          });
      });
  }

  /**
   * Opens or closes the form, clearing whatever was half-typed in it.
   */
  protected toggleRecording(): void {
    this.recording.update(open => !open);
    this.pickedFleet.set(null);
    this.pickerResults.set([]);
    this.pickerSearched.set(false);
    this.form.reset({
      search: '',
      validFrom: '',
      visibility: FleetAudience.PRIVATE,
    });
  }

  /**
   * Looks for the Fleet by name.
   *
   * Only records that exist here can be picked, because the entry is a
   * reference to one rather than a name somebody typed. Where a Fleet is not
   * listed, the registration pages are the way to give it a record — which the
   * empty result says rather than leaving somebody to guess.
   */
  protected search(): void {
    const term = this.form.controls.search.value.trim();

    if (term.length === 0) {
      return;
    }

    this._directory
      .listFleets({ search: term, pageSize: PICKER_RESULTS })
      .pipe(catchError(() => of(null)))
      .subscribe(page => {
        this.pickerSearched.set(true);
        this.pickerResults.set(page?.items ?? []);
      });
  }

  /**
   * Picks one of the search results.
   *
   * @param fleet - The Fleet chosen.
   */
  protected pick(fleet: StoFleetCard): void {
    this.pickedFleet.set(fleet);
    this.pickerResults.set([]);
  }

  /**
   * Records the picked Fleet as the Character's current one.
   */
  protected submit(): void {
    const fleet = this.pickedFleet();

    if (fleet === null || this.form.controls.validFrom.invalid) {
      this.form.controls.validFrom.markAsTouched();

      return;
    }

    this.write(
      this._service.record(this.characterId, {
        fleetId: fleet.id,
        validFrom: new Date(this.form.controls.validFrom.value).toISOString(),
        visibility: this.form.controls.visibility.value,
      }),
      'That Fleet could not be recorded.',
      () => this.toggleRecording(),
    );
  }

  /**
   * Records that the Character has left their current Fleet.
   *
   * The entry stays, closed, at the audience it already had. Leaving a Fleet
   * is not a retraction of having been in it.
   */
  protected leave(): void {
    this.write(
      this._service.leave(this.characterId),
      'That departure could not be recorded.',
    );
  }

  /**
   * Takes an entry out of the history, for one recorded in error.
   *
   * @param membership - The entry to withdraw.
   */
  protected withdraw(membership: CharacterFleetMembership): void {
    this.write(
      this._service.retract(this.characterId, membership.id),
      'That entry could not be withdrawn.',
    );
  }

  /**
   * Changes who may see one entry.
   *
   * @param membership - The entry being changed.
   * @param visibility - The audience chosen.
   */
  protected changeVisibility(
    membership: CharacterFleetMembership,
    visibility: string,
  ): void {
    this.write(
      this._service.setVisibility(
        this.characterId,
        membership.id,
        visibility as FleetAudience,
      ),
      'That visibility could not be changed.',
    );
  }

  /**
   * Accepts a proposal, which records the membership it was proposing.
   *
   * Private, like anything else recorded here: confirming that a Fleet's
   * roster has your Character on it is not a decision to publish the fact.
   *
   * @param proposal - The proposal being accepted.
   */
  protected accept(proposal: CharacterFleetProposal): void {
    this.write(
      this._service.accept(
        this.characterId,
        proposal.id,
        FleetAudience.PRIVATE,
      ),
      'That proposal could not be accepted.',
    );
  }

  /**
   * Declines a proposal, and only that proposal.
   *
   * @param proposal - The proposal being declined.
   */
  protected decline(proposal: CharacterFleetProposal): void {
    this.write(
      this._service.decline(this.characterId, proposal.id),
      'That proposal could not be declined.',
    );
  }

  /**
   * How long a proposal has left, or that it has run out.
   *
   * @param proposal - The proposal.
   * @returns The sentence beneath it.
   */
  protected deadline(proposal: CharacterFleetProposal): string {
    return proposal.state === CharacterFleetProposalState.EXPIRED
      ? `Expired ${this.instant(proposal.expiresAt)}`
      : `Answer by ${this.instant(proposal.expiresAt)}`;
  }

  /**
   * What an entry says about where it came from.
   *
   * @param membership - The entry.
   * @returns The source, in words.
   */
  protected sourceLabel(membership: CharacterFleetMembership): string {
    return CHARACTER_FLEET_SOURCE_LABELS[membership.source];
  }

  /**
   * What an entry says about who can see it.
   *
   * @param membership - The entry.
   * @returns The audience, in words.
   */
  protected audienceLabel(membership: CharacterFleetMembership): string {
    return FLEET_AUDIENCE_LABELS[membership.visibility];
  }

  /**
   * Links to the Community a proposal's Fleet belongs to.
   *
   * A proposal is only raised to somebody who can see the Fleet, and so its
   * Community, which is what makes naming it here safe.
   *
   * @param communitySlug - The Community's URL segment.
   * @returns The router link.
   */
  protected communityLink(communitySlug: string): string[] {
    return FLEET_LINKS.community(communitySlug);
  }

  /**
   * Writes an instant out in the reader's own timezone.
   *
   * @param value - The instant, as the server sent it.
   * @returns The date as the reader would write it.
   */
  protected instant(value: string): string {
    return this._datePipe.transform(value) ?? value;
  }

  /**
   * Runs a write, then reads both lists back.
   *
   * Reading back rather than patching what is held: a record closes another
   * one, an acceptance opens one and answers a proposal, and a panel that
   * guessed at those would eventually guess wrong.
   *
   * @param work - The request.
   * @param failure - What to say if it does not succeed.
   * @param onSuccess - Anything else to do afterwards.
   */
  private write<T>(
    work: Observable<T>,
    failure: string,
    onSuccess?: () => void,
  ): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    work.pipe(catchError(() => of(null))).subscribe(result => {
      this.busy.set(false);

      if (result === null) {
        this.errorMessage.set(failure);

        return;
      }

      onSuccess?.();
      this.reload();
    });
  }
}
