import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  catchError,
  debounceTime,
  finalize,
  forkJoin,
  of,
  switchMap,
} from 'rxjs';
import {
  CreditableMember,
  CrewCredit,
  CrewCreditRequest,
  CrewRole,
  ManagedChapter,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { ManagedActionRunner } from 'src/app/shared/actions/managed-action.runner';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';

/** How long to wait after a keystroke before searching for a member. */
const SEARCH_DEBOUNCE_MS = 300;

/** The shortest search the server will accept. */
const MIN_SEARCH_LENGTH = 2;

/**
 * Who is credited on a Story, and for what.
 *
 * A credit confers nothing at all — edit access comes only from an accepted
 * collaboration — so this page is deliberately separate from the Collaborators
 * one, and says so.
 *
 * The member is named rather than identified. The server resolves the username
 * and never hands one back, which is the same rule the registry keeps, so a
 * creator searches by the name they already know somebody by.
 */
@Component({
  selector: 'app-credit-list',
  templateUrl: './credit-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CreditListComponent implements OnInit {
  /** The credits, in credits-roll order. */
  credits: CrewCredit[] = [];

  /** The roles a credit may be given in. */
  roles: CrewRole[] = [];

  /** The Story's Chapters, for scoping a credit and bounding its run. */
  chapters: ManagedChapter[] = [];

  /** The Story's cast, for crediting somebody on one Character. */
  cast: ManagedCharacter[] = [];

  /** Members matching what has been typed into the member field. */
  matches: CreditableMember[] = [];

  /** The Story these credits belong to. */
  storyId = '';

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** The credit being reworded, if any. */
  editingCreditId: string | null = null;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _crewService = inject(CrewService);
  private readonly _chapterService = inject(ChapterService);
  private readonly _characterService = inject(CharacterService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new ManagedActionRunner(this, () => this.load());
  private readonly _confirm = new ConfirmPrompt();

  /**
   * The credit being written.
   *
   * `validFromChapterId` and `validToChapterId` bound the stretch of the Story
   * a credit applies to, which is how a contributor who wrote three Chapters
   * in the middle is recorded as having written those three.
   */
  readonly form = this._formBuilder.nonNullable.group({
    username: ['', Validators.required],
    roleId: ['', Validators.required],
    chapterId: [''],
    characterId: [''],
    creditLabel: [''],
    notes: [''],
    validFromChapterId: [''],
    validToChapterId: [''],
  });

  /** The wording being changed on an existing credit. */
  readonly editForm = this._formBuilder.nonNullable.group({
    creditLabel: [''],
    notes: [''],
  });

  /**
   * Loads the credits of the Story named in the route.
   */
  ngOnInit(): void {
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    this.watchMemberSearch();
    this.load();
  }

  /**
   * Whether a credit needs a starting Chapter before it can be saved.
   *
   * A credit that stops applying without ever having started describes
   * nothing, which is what the server refuses. Saying so here means the
   * creator finds out while they are still looking at the field.
   *
   * @returns True when an end was chosen without a beginning.
   */
  get needsStartingChapter(): boolean {
    const value = this.form.getRawValue();

    return Boolean(value.validToChapterId) && !value.validFromChapterId;
  }

  /**
   * Adds the credit on the form.
   */
  add(): void {
    if (this.form.invalid || this.needsStartingChapter) {
      this.form.markAllAsTouched();
      return;
    }

    this._actions.run(
      this._crewService.addCredit(this.storyId, this.buildRequest()),
      () => {
        this.form.reset();
        this.matches = [];
      },
    );
  }

  /**
   * Fills the member field from a search result.
   *
   * @param member - The member chosen.
   */
  choose(member: CreditableMember): void {
    this.form.controls.username.setValue(member.username);
    this.matches = [];
  }

  /**
   * Opens the wording of an existing credit for changing.
   *
   * Who is credited, in what role, and against what are not editable: changing
   * any of them makes it a different credit, which is a delete and an add.
   *
   * @param credit - The credit.
   */
  startEdit(credit: CrewCredit): void {
    this.editingCreditId = credit.id;
    this.editForm.setValue({
      creditLabel: credit.displayLabel,
      notes: credit.notes ?? '',
    });
  }

  /**
   * Leaves the wording as it was.
   */
  cancelEdit(): void {
    this.editingCreditId = null;
    this.editForm.reset();
  }

  /**
   * Saves the reworded credit.
   */
  saveEdit(): void {
    const creditId = this.editingCreditId;

    if (!creditId) {
      return;
    }

    const value = this.editForm.getRawValue();

    this._actions.run(
      this._crewService.updateCredit(creditId, {
        creditLabel: value.creditLabel.trim(),
        notes: value.notes.trim(),
      }),
      () => this.cancelEdit(),
    );
  }

  /**
   * Removes a credit, once the creator has agreed to lose it.
   *
   * @param credit - The credit.
   */
  remove(credit: CrewCredit): void {
    this._confirm
      .askToDestroy({
        title: 'Remove credit',
        question: 'Are you sure you want to remove this credit?',
        subject: this.describe(credit),
        consequence:
          'It comes off the credits roll, and putting it back means adding it again.',
        confirmText: 'Remove',
        cancelText: 'Keep it',
      })
      .subscribe(confirmed => {
        if (confirmed) {
          this._actions.run(this._crewService.removeCredit(credit.id));
        }
      });
  }

  /**
   * How a credit reads in the list.
   *
   * @param credit - The credit.
   * @returns Who is credited and for what.
   */
  describe(credit: CrewCredit): string {
    const who = credit.username ?? 'A member who has left';

    return `${who} — ${credit.displayLabel}`;
  }

  /**
   * What a credit is attached to, said in words.
   *
   * @param credit - The credit.
   * @returns The Chapter or Character it names, or the whole Story.
   */
  scopeOf(credit: CrewCredit): string {
    if (credit.characterId) {
      return this.nameOf(this.cast, credit.characterId, 'a Character');
    }

    if (credit.chapterId) {
      return this.nameOf(this.chapters, credit.chapterId, 'a Chapter');
    }

    return 'The whole Story';
  }

  /**
   * Builds the credit request from the form.
   *
   * Empty fields are left out rather than sent as empty strings, because the
   * server reads an absent Chapter as "the whole Story" and an empty one as a
   * Chapter identifier that is not a identifier at all.
   *
   * @returns The credit to add.
   */
  private buildRequest(): CrewCreditRequest {
    const value = this.form.getRawValue();

    return {
      username: value.username.trim(),
      roleId: value.roleId,
      ...(value.chapterId ? { chapterId: value.chapterId } : {}),
      ...(value.characterId ? { characterId: value.characterId } : {}),
      ...(value.creditLabel.trim()
        ? { creditLabel: value.creditLabel.trim() }
        : {}),
      ...(value.notes.trim() ? { notes: value.notes.trim() } : {}),
      ...(value.validFromChapterId
        ? { validFromChapterId: value.validFromChapterId }
        : {}),
      ...(value.validToChapterId
        ? { validToChapterId: value.validToChapterId }
        : {}),
    };
  }

  /**
   * Names a Chapter or Character, or says what kind of thing is missing.
   *
   * @param among - The things to look in.
   * @param id - The one to name.
   * @param fallback - What to say when it is not there.
   * @returns Its title or name.
   */
  private nameOf(
    among: readonly { id: string; title?: string; name?: string }[],
    id: string,
    fallback: string,
  ): string {
    const found = among.find(candidate => candidate.id === id);

    return found?.title ?? found?.name ?? fallback;
  }

  /**
   * Searches for members as the creator types a name.
   *
   * Debounced, and only once there is enough to search on: a single letter
   * would match most of the site and tell them nothing.
   */
  private watchMemberSearch(): void {
    this.form.controls.username.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap(typed => {
          const term = typed.trim();

          if (term.length < MIN_SEARCH_LENGTH) {
            return of([]);
          }

          return this._crewService
            .findCreditableMembers(this.storyId, term)
            .pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(matches => {
        // An exact match is what was asked for, not a suggestion to act on.
        this.matches =
          matches.length === 1 &&
          matches[0].username === this.form.getRawValue().username.trim()
            ? []
            : matches;
      });
  }

  /**
   * Loads the credits and everything a new one may be attached to.
   *
   * The Chapters and cast are fetched alongside so the scope choosers can be
   * filled. Failing to load either leaves that chooser empty rather than
   * reporting a broken page: a credit for the whole Story is still addable.
   */
  private load(): void {
    this.isLoading = true;

    forkJoin({
      credits: this._crewService.getMyCredits(this.storyId),
      roles: this._crewService.getRoles().pipe(catchError(() => of([]))),
      chapters: this._chapterService
        .getMyChapters(this.storyId)
        .pipe(catchError(() => of([]))),
      cast: this._characterService
        .getMyCharacters(this.storyId)
        .pipe(catchError(() => of([]))),
    })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: loaded => {
          this.credits = loaded.credits;
          this.roles = loaded.roles;
          this.chapters = loaded.chapters;
          this.cast = loaded.cast;
          this.errorMessage = '';
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 403
              ? 'You do not have access to this Story’s credits.'
              : 'The credits could not be loaded. Please try again shortly.';
        },
      });
  }
}
