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
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CompletionState,
  ContentRating,
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ManagedStory,
  StorytimeLanguage,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  COMPLETION_STATE_LABELS,
  COMPLETION_STATE_DESCRIPTIONS,
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';
import { TagPickerComponent } from '../../shared/tag-picker/tag-picker.component';
import { StorytimeService } from '../../storytime.service';
import { StoryService } from '../../story.service';

/**
 * Creating and editing a Story's metadata.
 *
 * The same form serves both, because the fields are identical and keeping two
 * would guarantee they drift.
 */
@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    TagPickerComponent,
  ],
})
export class StoryEditorComponent implements OnInit {
  /** The form backing the editor. */
  form!: FormGroup;

  /** The Story being edited, or null when creating a new one. */
  story: ManagedStory | null = null;

  /** Whether the editor is still loading an existing Story. */
  isLoading = false;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when saving failed. */
  errorMessage = '';

  /** Languages the server will accept. */
  languages: StorytimeLanguage[] = [];

  /** Ratings, with their labels. */
  readonly ratings = Object.values(ContentRating);

  /** Rating labels. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** Rating choices and their creator-facing explanations. */
  readonly ratingOptions = Object.values(ContentRating).map(rating => ({
    value: rating,
    label: CONTENT_RATING_LABELS[rating],
    description: CONTENT_RATING_DESCRIPTIONS[rating],
  }));

  /** Completion states. */
  readonly completionStates = Object.values(CompletionState);

  /** Completion labels. */
  readonly completionLabels = COMPLETION_STATE_LABELS;

  /** Completion choices and their creator-facing explanations. */
  readonly completionOptions = Object.values(CompletionState).map(state => ({
    value: state,
    label: COMPLETION_STATE_LABELS[state],
    description: COMPLETION_STATE_DESCRIPTIONS[state],
  }));

  /** Visibility options. */
  readonly visibilities = Object.values(StorytimeVisibility);

  /** Visibility labels. */
  readonly visibilityLabels = VISIBILITY_LABELS;

  /** Visibility choices and their creator-facing explanations. */
  readonly visibilityOptions = Object.values(StorytimeVisibility).map(
    visibility => ({
      value: visibility,
      label: VISIBILITY_LABELS[visibility],
      description: VISIBILITY_DESCRIPTIONS[visibility],
    }),
  );

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _storyService = inject(StoryService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Builds the form and loads the Story when editing an existing one.
   */
  ngOnInit(): void {
    this.form = this._formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', Validators.maxLength(220)],
      shortDescription: ['', Validators.maxLength(500)],
      description: [''],
      contentRating: [ContentRating.GENERAL],
      completionState: [CompletionState.ONGOING],
      visibility: [StorytimeVisibility.PRIVATE],
      languageCode: ['en-GB'],
    });

    this._storytimeService
      .getLanguages()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(languages => {
        this.languages = languages;
      });

    const storyId = this._route.snapshot.paramMap.get('storyId');

    if (storyId) {
      this.loadStory(storyId);
    }
  }

  /**
   * Whether the editor is creating a new Story rather than editing one.
   *
   * @returns True when there is no Story loaded.
   */
  get isNew(): boolean {
    return this.story === null;
  }

  /**
   * Saves the Story, creating it when new and updating it otherwise.
   */
  save(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const payload = { ...this.form.value } as Record<string, unknown>;

    // The version goes with the update so a stale edit is refused rather than
    // silently overwriting a change made elsewhere.
    if (this.story) {
      payload['version'] = this.story.version;
    }

    const request: Observable<ManagedStory> = this.story
      ? this._storyService.updateStory(this.story.id, payload)
      : this._storyService.createStory(payload);

    request
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: saved => {
          this.isSaving = false;
          void this._router.navigate([
            '/',
            this.appRoutes.STORYTIME,
            'manage',
            'stories',
            saved.id,
          ]);
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          // The server's message names the specific problem, which is more
          // use to a creator than a generic failure would be.
          this.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'This Story could not be saved. Please try again shortly.';
        },
      });
  }

  /**
   * Loads an existing Story into the form.
   *
   * @param storyId - The Story to load.
   */
  private loadStory(storyId: string): void {
    this.isLoading = true;

    this._storyService
      .getMyStory(storyId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: story => {
          this.story = story;
          this.form.patchValue({
            title: story.title,
            slug: story.slug,
            shortDescription: story.shortDescription ?? '',
            description: story.description ?? '',
            contentRating: story.contentRating,
            completionState: story.completionState,
            visibility: story.visibility,
            languageCode: story.languageCode,
          });
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'That Story could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
