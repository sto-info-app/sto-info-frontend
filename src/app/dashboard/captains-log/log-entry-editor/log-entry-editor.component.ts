import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, filter, map, of, switchMap, take } from 'rxjs';

import {
  CreateLogEntryRequest,
  LogEntry,
  LogEntryType,
} from 'src/app/models/captains-log.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { HasUnsavedChanges } from 'src/app/shared/guards/unsaved-changes.guard';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { dateToStoStardate } from 'src/app/shared/utils/stardate.utils';

import {
  defaultLogHeadline,
  LOG_BODY_MAX_LENGTH,
  LOG_HEADLINE_MAX_LENGTH,
  LOG_TYPE_HINTS,
  LOG_TYPE_LABELS,
  logPictureOf,
} from '../captains-log.constants';
import { CaptainsLogService } from '../captains-log.service';
import {
  LogPictureDialogComponent,
  LogPictureDialogData,
} from '../log-picture-dialog/log-picture-dialog.component';

/** What to say when an entry could not be read. */
export const LOG_ENTRY_LOAD_FAILED =
  'The entry could not be loaded. Please try again.';

/** What to say when an entry could not be saved. */
export const LOG_ENTRY_SAVE_FAILED =
  'The entry could not be saved. Please try again.';

/** What to say when an entry or its picture could not be removed. */
export const LOG_ENTRY_REMOVE_FAILED =
  'That could not be removed. Please try again.';

/** What is asked before a Personal entry becomes a Captain's one. */
export const LOG_GOING_PUBLIC = {
  title: 'Show this entry on your profile?',
  message:
    "<p>A Captain's entry is shown on your public profile while your " +
    'profile is publicly visible, with its picture.</p>',
  confirmText: "Make it a Captain's entry",
  cancelText: 'Keep it Personal',
};

/**
 * Writing or editing a Captain's Log entry (sc-1450).
 *
 * A new entry is saved first and then opens here again, where its picture
 * can be added: a picture is uploaded against an entry that exists. Its
 * stardate is stamped by the server when it is first saved and never
 * changes, so a headline left blank always reads the same.
 */
@Component({
  selector: 'app-log-entry-editor',
  templateUrl: './log-entry-editor.component.html',
  styleUrls: ['./log-entry-editor.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CollapsibleSectionComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LcarsWarningMessageComponent,
    LoadingBarComponent,
    MarkdownPipe,
  ],
})
export class LogEntryEditorComponent implements OnInit, HasUnsavedChanges {
  private readonly _fb = inject(FormBuilder);
  private readonly _log = inject(CaptainsLogService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly logLink = '/' + APP_ROUTES.STO_DASHBOARD_LOG;
  readonly types = Object.values(LogEntryType);
  readonly typeLabels = LOG_TYPE_LABELS;
  readonly typeHints = LOG_TYPE_HINTS;
  readonly headlineMaxLength = LOG_HEADLINE_MAX_LENGTH;
  readonly bodyMaxLength = LOG_BODY_MAX_LENGTH;

  /** The entry being edited, or null for a new one. */
  readonly entryId = signal<string | null>(null);
  /** The entry as last read; null until loaded, or when new. */
  readonly entry = signal<LogEntry | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly showPreview = signal(false);

  readonly form = this._fb.nonNullable.group({
    type: [LogEntryType.CAPTAIN],
    headline: ['', [Validators.maxLength(LOG_HEADLINE_MAX_LENGTH)]],
    body: [
      '',
      [Validators.required, Validators.maxLength(LOG_BODY_MAX_LENGTH)],
    ],
  });

  /**
   * The form as it is typed, for what is drawn from it. Read whole, so a
   * removed entry's disabled fields still count.
   */
  private readonly _value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  /** The stardate the entry is, or will be, headed by when left blank. */
  private readonly _stardate = computed(
    () => this.entry()?.stardate ?? dateToStoStardate(),
  );

  /** The headline the entry has when none is typed. */
  readonly stardateHeadline = computed(() =>
    defaultLogHeadline(this._value().type, this._stardate()),
  );

  /** How much of the body has been typed. */
  readonly bodyLength = computed(() => this._value().body.length);

  /** The body, for the preview. */
  readonly bodyValue = computed(() => this._value().body);

  /** The entry's picture, card-sized, or null. */
  readonly picture = computed(() => {
    const entry = this.entry();

    return entry ? logPictureOf(entry, 'card') : null;
  });

  /** Whether moderators have removed the entry, so it may not be changed. */
  readonly isRemoved = computed(() => !!this.entry()?.removedAt);

  /**
   * Loads the entry for editing when an `id` route parameter is present.
   */
  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');

    if (id) {
      this.entryId.set(id);
      this.load(id);
    }
  }

  /**
   * Whether leaving now would throw typing away.
   *
   * @returns True while the form holds unsaved changes.
   */
  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  /**
   * Toggles the Markdown preview.
   */
  togglePreview(): void {
    this.showPreview.update(shown => !shown);
  }

  /**
   * Saves the entry. A Personal entry becoming a Captain's one is asked
   * about first, since it will then be shown on the member's profile.
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const value = this.form.getRawValue();
    const request: CreateLogEntryRequest = {
      type: value.type,
      headline: value.headline.trim(),
      body: value.body,
    };
    const id = this.entryId();
    const goingPublic =
      this.entry()?.type === LogEntryType.PERSONAL &&
      value.type === LogEntryType.CAPTAIN;

    (goingPublic ? this._confirm.ask(LOG_GOING_PUBLIC) : of(true))
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.isSaving.set(true);
          this.errorMessage.set('');

          return id ? this._log.update(id, request) : this._log.create(request);
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: saved => this.afterSave(id, saved),
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set(LOG_ENTRY_SAVE_FAILED);
        },
      });
  }

  /**
   * Sets or replaces the picture, through the cropping dialogue. The entry
   * shows it once the scanner has cleared it.
   *
   * @param entry - The entry.
   */
  onSetPicture(entry: LogEntry): void {
    const data: LogPictureDialogData = {
      entryId: entry.id,
      scopeName: entry.headline,
      currentAlt: entry.pictureAlt,
    };

    this.errorMessage.set('');
    this._dialog
      .open(LogPictureDialogComponent, {
        data,
        width: '90vw',
        maxWidth: '1100px',
      })
      .afterClosed()
      .pipe(take(1), filter(Boolean), takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this.load(entry.id));
  }

  /**
   * Removes the picture, once asked.
   *
   * @param entry - The entry.
   */
  onRemovePicture(entry: LogEntry): void {
    this.removeOnceAsked(
      {
        title: 'Remove the picture?',
        question: 'Remove this entry’s picture?',
        consequence:
          'It is taken down straight away and cannot be put back without ' +
          'uploading it again.',
        confirmText: 'Remove',
      },
      () => this._log.removePicture(entry.id),
      () => this.load(entry.id),
    );
  }

  /**
   * Deletes the entry for good, once asked, and goes back to the Log.
   *
   * @param entry - The entry.
   */
  onDelete(entry: LogEntry): void {
    this.removeOnceAsked(
      {
        title: 'Delete this entry?',
        question: 'Delete this Log entry for good?',
        subject: entry.headline,
        consequence:
          'It cannot be recovered, and its picture is taken down with it.',
        confirmText: 'Delete',
      },
      () => this._log.delete(entry.id),
      () => {
        this.form.markAsPristine();
        void this._router.navigate([this.logLink]);
      },
    );
  }

  /**
   * Asks before removing something, then removes it.
   *
   * @param question - What to ask.
   * @param removal - Sends the removal, only once agreed.
   * @param done - What to do once it is gone.
   */
  private removeOnceAsked(
    question: Parameters<ConfirmPrompt['askToDestroy']>[0],
    removal: () => Observable<void>,
    done: () => void,
  ): void {
    this.errorMessage.set('');
    this._confirm
      .askToDestroy(question)
      .pipe(
        filter(Boolean),
        switchMap(removal),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: done,
        error: () => this.errorMessage.set(LOG_ENTRY_REMOVE_FAILED),
      });
  }

  /**
   * Reads the entry, filling the form the first time.
   *
   * @param id - The entry.
   */
  private load(id: string): void {
    const first = this.entry() === null;

    this.isLoading.set(true);
    this._log
      .get(id)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: entry => {
          this.entry.set(entry);
          this.isLoading.set(false);

          if (first) {
            this.form.reset({
              type: entry.type,
              headline: entry.customHeadline ?? '',
              body: entry.body,
            });
          }

          if (entry.removedAt) {
            this.form.disable();
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set(LOG_ENTRY_LOAD_FAILED);
        },
      });
  }

  /**
   * Leaves the form once saved: an edit returns to the Log, and a new entry
   * opens on its own edit page, where its picture can be added.
   *
   * @param id - The entry edited, or null when it was new.
   * @param saved - The entry as saved.
   */
  private afterSave(id: string | null, saved: LogEntry): void {
    this.isSaving.set(false);
    this.form.markAsPristine();

    if (id) {
      void this._router.navigate([this.logLink]);

      return;
    }

    void this._router.navigate(
      ['/' + APP_ROUTES.STO_DASHBOARD_LOG_EDIT.replace(':id', saved.id)],
      { replaceUrl: true },
    );
  }
}
