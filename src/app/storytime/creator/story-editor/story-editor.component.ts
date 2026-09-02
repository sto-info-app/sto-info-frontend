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
import { ArcService } from '../../arc.service';
import { ContentPolicyPanelComponent } from '../../shared/content-policy-panel/content-policy-panel.component';
import { EditorActionsComponent } from '../../shared/editor-actions/editor-actions.component';
import { ImageManagerComponent } from '../../shared/image-manager/image-manager.component';
import { MarkdownHintComponent } from '../../shared/markdown-hint/markdown-hint.component';
import { SettingOption } from '../../shared/setting-help/setting-help.component';
import { SettingSelectComponent } from '../../shared/setting-select/setting-select.component';
import {
  StorytimeEditorSupport,
  syncImageDescription,
  toLanguageOptions,
} from '../../shared/storytime-editor.support';
import { TagPickerComponent } from '../../shared/tag-picker/tag-picker.component';
import { createWorkForm } from '../../shared/work-form.factory';
import { StoryService } from '../../story.service';
import { StorytimeImageSlot } from '../../storytime-image.constants';
import {
  COMPLETION_STATE_OPTIONS,
  CONTENT_RATING_OPTIONS,
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
    EditorActionsComponent,
    ImageManagerComponent,
  ],
})
export class StoryEditorComponent implements OnInit {
  /** The form backing the editor. */
  form!: FormGroup;

  /** The Story being edited, or null when creating a new one. */
  story: ManagedStory | null = null;

  /**
   * The Arc this Story is being written for, when reached from one.
   *
   * Carried in the address rather than held on a service, so the page works
   * on its own: a curator who opens it in a new tab, or comes back to it,
   * still gets the Story they meant into the Arc they meant.
   */
  arcId: string | null = null;

  /** Whether the editor is still loading an existing Story. */
  isLoading = false;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when saving failed. */
  errorMessage = '';

  /** Languages the server will accept. */
  languages: StorytimeLanguage[] = [];

  /** Rating choices, explained as the Story page explains them. */
  readonly ratingOptions = CONTENT_RATING_OPTIONS;

  /** Completion choices, explained as the Story page explains them. */
  readonly completionOptions = COMPLETION_STATE_OPTIONS;

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

  /** The artwork slots a Story carries. */
  readonly imageSlots = StorytimeImageSlot;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _storyService = inject(StoryService);
  private readonly _arcService = inject(ArcService);
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
    this.arcId = this._route.snapshot.queryParamMap.get('arc') ?? null;

    if (storyId) {
      this.loadStory(storyId);
    }
  }

  /**
   * Whether this Story will join an Arc as soon as it is saved.
   *
   * @returns True when a new Story was started from an Arc.
   */
  get isJoiningArc(): boolean {
    return this.isNew && this.arcId !== null;
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
   *
   * A Story started from an Arc joins it on that first save and goes straight
   * to its Chapters, because somebody who has just described a Story wants to
   * write it — not to be returned to the Arc to admire the title.
   */
  save(): void {
    const arcId = this.arcId;

    if (this.isNew && arcId) {
      this.submit(
        savedId => ['manage', 'stories', savedId, 'chapters'],
        saved => this.joinArc(arcId, saved),
      );
      return;
    }

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
   * Takes the Story back from an artwork change.
   *
   * The whole Story is kept rather than only the new picture, because setting
   * one moves the version on: an editor still holding the old one would have
   * its next save refused as stale.
   *
   * @param updated - The Story as the server now holds it.
   */
  onImageChanged(updated: unknown): void {
    const story = updated as ManagedStory;

    this.story = story;
    this.syncImageDescriptions(story);
  }

  /**
   * Takes the Story back from a save.
   *
   * An existing Story is edited at the address it is saved to, so the
   * navigation that follows a save leaves the creator here. Without this the
   * editor would still be holding the version it loaded, and a second save —
   * from a page showing no sign of anything having changed — would be refused
   * as stale.
   *
   * @param saved - The Story as the server now holds it.
   */
  onSaved(saved: ManagedStory): void {
    this.story = saved;
    this.syncImageDescriptions(saved);
  }

  /**
   * Puts the newly created Story into the Arc it was written for.
   *
   * The Story is kept first: it exists whatever the Arc says next, and an
   * editor that forgot about it would offer to create a second one.
   *
   * @param arcId - The Arc it was started from.
   * @param saved - The Story as the server created it.
   * @returns The join.
   */
  private joinArc(arcId: string, saved: ManagedStory): Observable<unknown> {
    this.story = saved;

    return this._arcService.inviteStory(arcId, saved.id);
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
   * Matches the description fields to the artwork the Story actually has.
   *
   * @param story - The Story as the server holds it.
   */
  private syncImageDescriptions(story: ManagedStory): void {
    syncImageDescription(
      this.form,
      'bannerImageAlt',
      story.bannerImageUrl,
      story.bannerImageAlt,
    );
    syncImageDescription(
      this.form,
      'profileImageAlt',
      story.profileImageUrl,
      story.profileImageAlt,
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
          this.syncImageDescriptions(story);
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'That Story could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
