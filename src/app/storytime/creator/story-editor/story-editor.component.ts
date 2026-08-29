import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  CompletionState,
  ContentRating,
  ManagedStory,
  StoryStatus,
  StorytimeLanguage,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ContentPolicyPanelComponent } from '../../shared/content-policy-panel/content-policy-panel.component';
import { MarkdownHintComponent } from '../../shared/markdown-hint/markdown-hint.component';
import { SettingOption } from '../../shared/setting-help/setting-help.component';
import { SettingSelectComponent } from '../../shared/setting-select/setting-select.component';
import {
  StorytimeEditorSupport,
  toLanguageOptions,
} from '../../shared/storytime-editor.support';
import { TagPickerComponent } from '../../shared/tag-picker/tag-picker.component';
import { createWorkForm } from '../../shared/work-form.factory';
import { StoryService } from '../../story.service';
import {
  COMPLETION_STATE_DESCRIPTIONS,
  COMPLETION_STATE_LABELS,
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';

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
    SettingSelectComponent,
    MarkdownHintComponent,
    ContentPolicyPanelComponent,
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

  /** Rating choices and their creator-facing explanations. */
  readonly ratingOptions = Object.values(ContentRating).map(rating => ({
    value: rating,
    label: CONTENT_RATING_LABELS[rating],
    description: CONTENT_RATING_DESCRIPTIONS[rating],
  }));

  /** Completion choices and their creator-facing explanations. */
  readonly completionOptions = Object.values(CompletionState).map(state => ({
    value: state,
    label: COMPLETION_STATE_LABELS[state],
    description: COMPLETION_STATE_DESCRIPTIONS[state],
  }));

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
  private readonly _storyService = inject(StoryService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _editor = new StorytimeEditorSupport(this);

  /**
   * Builds the form and loads the Story when editing an existing one.
   */
  ngOnInit(): void {
    this.form = createWorkForm(this._formBuilder, {
      contentRating: [ContentRating.GENERAL],
      completionState: [CompletionState.ONGOING],
    });

    this._editor.loadLanguages();

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
   * The languages, as the chooser shows them.
   *
   * @returns One choice per language the server accepts.
   */
  get languageOptions(): SettingOption[] {
    return toLanguageOptions(this.languages);
  }

  /**
   * Whether publishing is a sensible next action from here.
   *
   * Offered only once the Story exists and is not already published: a Story
   * with nothing in it cannot be published, and a button that could only ever
   * be refused is worse than no button.
   *
   * @returns True when the Story can be published.
   */
  get canPublish(): boolean {
    return this.story !== null && this.story.status !== StoryStatus.PUBLISHED;
  }

  /**
   * Saves the Story, creating it when new and updating it otherwise.
   */
  save(): void {
    this.submit(savedId => ['manage', 'stories', savedId]);
  }

  /**
   * Saves what is on the screen, publishes it, and returns to the list.
   *
   * Back to the list rather than staying here, because publishing is the end
   * of working on this Story and the beginning of deciding what to do with the
   * next one.
   */
  publish(): void {
    this.submit(
      () => ['manage', 'stories'],
      saved => this._storyService.publishStory(saved.id),
    );
  }

  /**
   * Records that the terms have been accepted, so the panel closes.
   *
   * @param story - The Story as the server now holds it.
   */
  onPolicyAccepted(story: ManagedStory): void {
    this.story = story;
  }

  /**
   * Sends the form, then goes where the caller asked.
   *
   * @param destination - The route under Storytime to go to, from the saved id.
   * @param then - Anything to do with the saved Story before leaving.
   */
  private submit(
    destination: (savedId: string) => string[],
    then?: (saved: ManagedStory) => Observable<unknown>,
  ): void {
    const payload = this._editor.beginSave(this.form, this.story?.version);

    if (!payload) {
      return;
    }

    const request: Observable<ManagedStory> = this.story
      ? this._storyService.updateStory(this.story.id, payload)
      : this._storyService.createStory(payload);

    this._editor.save(
      request,
      destination,
      'This Story could not be saved. Please try again shortly.',
      then,
    );
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
