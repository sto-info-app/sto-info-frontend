import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ManagedChapter,
  StorytimeLanguage,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ChapterService } from '../../chapter.service';
import { StorytimeService } from '../../storytime.service';

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
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
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

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _chapterService = inject(ChapterService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);

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

    this._storytimeService
      .getLanguages()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(languages => {
        this.languages = languages;
      });

    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    const chapterId = this._route.snapshot.paramMap.get('chapterId');

    if (chapterId) {
      this.loadChapter(chapterId);
    }
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
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const payload = { ...this.form.value } as Record<string, unknown>;

    // An empty language means "the same as the Story", which the server
    // expects as an absent field rather than an empty string.
    if (!payload['languageCode']) {
      delete payload['languageCode'];
    }

    if (this.chapter) {
      payload['version'] = this.chapter.version;
    }

    const request: Observable<ManagedChapter> = this.chapter
      ? this._chapterService.updateChapter(this.chapter.id, payload)
      : this._chapterService.createChapter(this.storyId, payload);

    request.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: saved => {
        this.isSaving = false;
        void this._router.navigate([
          '/',
          this.appRoutes.STORYTIME,
          'manage',
          'chapters',
          saved.id,
        ]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        // The server names the specific problem, which is more use to a writer
        // than a generic failure would be.
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'This Chapter could not be saved. Please try again shortly.';
      },
    });
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
      .pipe(takeUntilDestroyed(this._destroyRef))
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
        },
        error: () => {
          this.errorMessage = 'That Chapter could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
