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
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ChapterAppearance,
  ChapterMedia,
  ManagedChapter,
  ManagedCharacter,
  StorytimeLanguage,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { MediaService } from '../../media.service';
import { MarkdownHintComponent } from '../../shared/markdown-hint/markdown-hint.component';
import { SettingOption } from '../../shared/setting-help/setting-help.component';
import { SettingSelectComponent } from '../../shared/setting-select/setting-select.component';
import {
  StorytimeEditorSupport,
  toLanguageOptions,
} from '../../shared/storytime-editor.support';

/**
 * Writing and editing a Chapter.
 *
 * The same form serves creating and editing, because the fields are identical
 * and keeping two would guarantee they drift.
 */
@Component({
  selector: 'app-chapter-editor',
  templateUrl: './chapter-editor.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
    SettingSelectComponent,
    MarkdownHintComponent,
  ],
})
export class ChapterEditorComponent implements OnInit {
  /** The form backing the editor. */
  form!: FormGroup;

  /** The Chapter being edited, or null when writing a new one. */
  chapter: ManagedChapter | null = null;

  /** The Story this Chapter belongs to. */
  storyId = '';

  /** Whether an existing Chapter is still loading. */
  isLoading = false;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when saving failed. */
  errorMessage = '';

  /** Languages the server will accept. */
  languages: StorytimeLanguage[] = [];

  /** The Story's whole cast, to choose from. */
  cast: ManagedCharacter[] = [];

  /** The Characters ticked as appearing in this Chapter. */
  appearingCharacterIds = new Set<string>();

  /** Whether the cast is being saved. */
  isSavingCast = false;

  /** A message to show when the cast could not be saved. */
  castErrorMessage = '';

  /** The videos embedded in this Chapter, in order. */
  media: ChapterMedia[] = [];

  /** The share URL a creator has pasted but not yet added. */
  mediaUrl = '';

  /** A message to show when a video could not be added. */
  mediaErrorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /**
   * The languages, as the chooser shows them.
   *
   * The Story's own language leads, because a Chapter written in something
   * else is the exception rather than a choice every writer has to make.
   *
   * @returns The choices, starting with deferring to the Story.
   */
  get languageOptions(): SettingOption[] {
    return [
      { value: '', label: 'Same as the Story' },
      ...toLanguageOptions(this.languages),
    ];
  }

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _chapterService = inject(ChapterService);
  private readonly _characterService = inject(CharacterService);
  private readonly _mediaService = inject(MediaService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _editor = new StorytimeEditorSupport(this);

  /**
   * Builds the form and loads the Chapter when editing an existing one.
   */
  ngOnInit(): void {
    this.form = this._formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', Validators.maxLength(220)],
      synopsis: ['', Validators.maxLength(1000)],
      contentSource: [''],
      languageCode: [''],
    });

    this._editor.loadLanguages();

    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    const chapterId = this._route.snapshot.paramMap.get('chapterId');

    if (chapterId) {
      this.loadChapter(chapterId);
      this.loadAppearances(chapterId);
      this.loadMedia(chapterId);
    }

    this.loadCast();
  }

  /**
   * Adds or removes a Character from this Chapter's cast.
   *
   * @param characterId - The Character ticked or unticked.
   */
  toggleAppearance(characterId: string): void {
    if (this.appearingCharacterIds.has(characterId)) {
      this.appearingCharacterIds.delete(characterId);
    } else {
      this.appearingCharacterIds.add(characterId);
    }
  }

  /**
   * Whether a Character is ticked as appearing.
   *
   * @param characterId - The Character.
   * @returns True when they appear in this Chapter.
   */
  isAppearing(characterId: string): boolean {
    return this.appearingCharacterIds.has(characterId);
  }

  /**
   * Saves this Chapter's cast.
   *
   * Saved separately from the Chapter itself, because a Chapter has to exist
   * before anybody can appear in it: there is nothing to attach a cast to
   * until the first save has happened.
   */
  saveCast(): void {
    const chapterId = this.chapter?.id;

    if (!chapterId || this.isSavingCast) {
      return;
    }

    this.isSavingCast = true;
    this.castErrorMessage = '';

    this._characterService
      .setAppearances(
        chapterId,
        // Sent in cast order rather than tick order, so the Chapter's cast
        // list reads the same way as the Story's.
        this.cast
          .filter(character => this.appearingCharacterIds.has(character.id))
          .map(character => ({ characterId: character.id })),
      )
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.isSavingCast = false;
        },
        error: () => {
          this.castErrorMessage =
            'The cast could not be saved. Please try again shortly.';
          this.isSavingCast = false;
        },
      });
  }

  /**
   * Adds the pasted video to this Chapter.
   *
   * The URL is sent whole and parsed on the server, so a creator can paste
   * whatever the Share button gave them and the client never has to guess at
   * what a valid YouTube link looks like.
   */
  addMedia(): void {
    const chapterId = this.chapter?.id;
    const url = this.mediaUrl.trim();

    if (!chapterId || url.length === 0) {
      return;
    }

    this.mediaErrorMessage = '';

    this._mediaService
      .addMedia(chapterId, { url })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: media => {
          this.media = [...this.media, media];
          this.mediaUrl = '';
        },
        error: (error: HttpErrorResponse) => {
          this.mediaErrorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'That video could not be added. Please try again shortly.';
        },
      });
  }

  /**
   * Removes a video from this Chapter.
   *
   * @param media - The video to remove.
   */
  removeMedia(media: ChapterMedia): void {
    this._mediaService
      .removeMedia(media.id)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.media = this.media.filter(entry => entry.id !== media.id);
        },
        error: () => {
          this.mediaErrorMessage =
            'That video could not be removed. Please try again shortly.';
        },
      });
  }

  /**
   * Loads the videos already on this Chapter.
   *
   * Silently: a Chapter with no videos is the normal case, and a failure here
   * must leave the writing editable.
   *
   * @param chapterId - The Chapter.
   */
  private loadMedia(chapterId: string): void {
    this._mediaService
      .getMyChapterMedia(chapterId)
      .pipe(
        catchError(() => of([] as ChapterMedia[])),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(media => {
        this.media = media;
      });
  }

  /**
   * Loads the Story's cast to choose from.
   *
   * Silently: not every Story has a cast, and a failure here must leave the
   * Chapter editable rather than blocking the writing over a section that may
   * well be empty anyway.
   */
  private loadCast(): void {
    if (!this.storyId) {
      return;
    }

    this._characterService
      .getMyCharacters(this.storyId)
      .pipe(
        catchError(() => of([] as ManagedCharacter[])),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(cast => {
        this.cast = cast;
      });
  }

  /**
   * Loads who already appears in this Chapter.
   *
   * @param chapterId - The Chapter.
   */
  private loadAppearances(chapterId: string): void {
    this._characterService
      .getAppearances(chapterId)
      .pipe(
        catchError(() => of([] as ChapterAppearance[])),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(appearances => {
        this.appearingCharacterIds = new Set(
          appearances
            .map(appearance => appearance.character?.id)
            .filter((id): id is string => id !== undefined),
        );
      });
  }

  /**
   * Whether the editor is writing a new Chapter rather than editing one.
   *
   * @returns True when there is no Chapter loaded.
   */
  get isNew(): boolean {
    return this.chapter === null;
  }

  /**
   * Saves the Chapter, creating it when new and updating it otherwise.
   */
  save(): void {
    const payload = this._editor.beginSave(this.form, this.chapter?.version);

    if (!payload) {
      return;
    }

    // An empty language means "the same as the Story", which the server
    // expects as an absent field rather than an empty string.
    if (!payload['languageCode']) {
      delete payload['languageCode'];
    }

    const request: Observable<ManagedChapter> = this.chapter
      ? this._chapterService.updateChapter(this.chapter.id, payload)
      : this._chapterService.createChapter(this.storyId, payload);

    this._editor.save(
      request,
      savedId => ['manage', 'chapters', savedId],
      'This Chapter could not be saved. Please try again shortly.',
    );
  }

  /**
   * Loads an existing Chapter into the form.
   *
   * @param chapterId - The Chapter to load.
   */
  private loadChapter(chapterId: string): void {
    this.isLoading = true;

    this._chapterService
      .getMyChapter(chapterId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: chapter => {
          this.chapter = chapter;
          this.storyId = chapter.storyId;
          this.form.patchValue({
            title: chapter.title,
            slug: chapter.slug,
            synopsis: chapter.synopsis ?? '',
            contentSource: chapter.contentSource,
            // The creator's own setting, not the resolved one, so leaving
            // the field alone keeps the Chapter following its Story.
            languageCode: chapter.ownLanguageCode ?? '',
          });
          this.isLoading = false;
          // Only now is the Story known, when editing an existing Chapter
          // reached by its own identifier rather than through its Story.
          this.loadCast();
        },
        error: () => {
          this.errorMessage = 'That Chapter could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
