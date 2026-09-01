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
  ArcStatus,
  ManagedArc,
  StorytimeLanguage,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
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
import { StorytimeImageSlot } from '../../storytime-image.constants';
import {
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';

/**
 * Creating and editing an Arc's details.
 *
 * The same form serves both, because the fields are identical and keeping two
 * would guarantee they drift.
 */
@Component({
  selector: 'app-arc-editor',
  templateUrl: './arc-editor.component.html',
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
    ImageManagerComponent,
    EditorActionsComponent,
  ],
})
export class ArcEditorComponent implements OnInit {
  /** The form backing the editor. */
  form!: FormGroup;

  /** The Arc being edited, or null when creating a new one. */
  arc: ManagedArc | null = null;

  /** Whether the editor is still loading an existing Arc. */
  isLoading = false;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when saving failed. */
  errorMessage = '';

  /** Languages the server will accept. */
  languages: StorytimeLanguage[] = [];

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

  /** The artwork slots an Arc carries. */
  readonly imageSlots = StorytimeImageSlot;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _editor = new StorytimeEditorSupport(this);

  /**
   * Builds the form and loads the Arc when editing an existing one.
   */
  ngOnInit(): void {
    this.form = createWorkForm(this._formBuilder);

    this._editor.loadLanguages();

    const arcId = this._route.snapshot.paramMap.get('arcId');

    if (arcId) {
      this.loadArc(arcId);
    }
  }

  /**
   * Whether the editor is creating a new Arc rather than editing one.
   *
   * @returns True when there is no Arc loaded.
   */
  get isNew(): boolean {
    return this.arc === null;
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
   * Offered once the Arc exists and is not already published. An Arc still
   * needs an agreed Story in it before the server will publish one, which is
   * the server's to say — and it says so in words worth reading.
   *
   * @returns True when the Arc can be published.
   */
  get canPublish(): boolean {
    return this.arc !== null && this.arc.status !== ArcStatus.PUBLISHED;
  }

  /**
   * Saves the Arc, creating it when new and updating it otherwise.
   */
  save(): void {
    this.submit(savedId => ['manage', 'arcs', savedId, 'stories']);
  }

  /**
   * Saves what is on the screen, publishes it, and returns to the list.
   */
  publish(): void {
    this.submit(
      () => ['manage', 'arcs'],
      saved => this._arcService.publishArc(saved.id),
    );
  }

  /**
   * Takes the Arc back from an artwork change.
   *
   * The whole Arc is kept rather than only the new picture, because setting
   * one moves the version on: an editor still holding the old one would have
   * its next save refused as stale.
   *
   * @param updated - The Arc as the server now holds it.
   */
  onImageChanged(updated: unknown): void {
    const arc = updated as ManagedArc;

    this.arc = arc;
    this.syncImageDescriptions(arc);
  }

  /**
   * Matches the description fields to the artwork the Arc actually has.
   *
   * @param arc - The Arc as the server holds it.
   */
  private syncImageDescriptions(arc: ManagedArc): void {
    syncImageDescription(
      this.form,
      'bannerImageAlt',
      arc.bannerImageUrl,
      arc.bannerImageAlt,
    );
    syncImageDescription(
      this.form,
      'profileImageAlt',
      arc.profileImageUrl,
      arc.profileImageAlt,
    );
  }

  /**
   * Sends the form, then goes where the caller asked.
   *
   * @param destination - The route under Storytime to go to, from the saved id.
   * @param then - Anything to do with the saved Arc before leaving.
   */
  private submit(
    destination: (savedId: string) => string[],
    then?: (saved: ManagedArc) => Observable<unknown>,
  ): void {
    const payload = this._editor.beginSave(this.form, this.arc?.version);

    if (!payload) {
      return;
    }

    const request: Observable<ManagedArc> = this.arc
      ? this._arcService.updateArc(this.arc.id, payload)
      : this._arcService.createArc(payload);

    this._editor.save(
      request,
      destination,
      'This Arc could not be saved. Please try again shortly.',
      then,
    );
  }

  /**
   * Loads an existing Arc into the form.
   *
   * @param arcId - The Arc to load.
   */
  private loadArc(arcId: string): void {
    this.isLoading = true;

    this._arcService
      .getMyArc(arcId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: arc => {
          this.arc = arc;
          this.form.patchValue({
            title: arc.title,
            slug: arc.slug,
            shortDescription: arc.shortDescription ?? '',
            description: arc.description ?? '',
            visibility: arc.visibility,
            languageCode: arc.languageCode,
          });
          this.syncImageDescriptions(arc);
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'That Arc could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
