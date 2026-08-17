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
  ManagedArc,
  StorytimeLanguage,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ArcService } from '../../arc.service';
import {
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';
import { StorytimeService } from '../../storytime.service';

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

  /** Visibility options. */
  readonly visibilities = Object.values(StorytimeVisibility);

  /** Visibility labels. */
  readonly visibilityLabels = VISIBILITY_LABELS;

  /** Explanations of what each visibility actually means. */
  readonly visibilityDescriptions = VISIBILITY_DESCRIPTIONS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _arcService = inject(ArcService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Builds the form and loads the Arc when editing an existing one.
   */
  ngOnInit(): void {
    this.form = this._formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', Validators.maxLength(220)],
      shortDescription: ['', Validators.maxLength(500)],
      description: [''],
      visibility: [StorytimeVisibility.PRIVATE],
      languageCode: ['en'],
    });

    this._storytimeService
      .getLanguages()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(languages => {
        this.languages = languages;
      });

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
   * Explains what the currently selected visibility actually means.
   *
   * Resolved here rather than in the template because a form control's value is
   * untyped, and indexing the description map with it does not compile.
   *
   * @returns The explanation for the selected visibility.
   */
  get visibilityDescription(): string {
    const selected = this.form.controls['visibility']
      .value as StorytimeVisibility;

    return this.visibilityDescriptions[selected];
  }

  /**
   * Saves the Arc, creating it when new and updating it otherwise.
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
    // silently overwriting a change made by a co-curator.
    if (this.arc) {
      payload['version'] = this.arc.version;
    }

    const request: Observable<ManagedArc> = this.arc
      ? this._arcService.updateArc(this.arc.id, payload)
      : this._arcService.createArc(payload);

    request.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: saved => {
        this.isSaving = false;
        void this._router.navigate([
          '/',
          this.appRoutes.STORYTIME,
          'manage',
          'arcs',
          saved.id,
          'stories',
        ]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        // The server's message names the specific problem — a slug already
        // taken, or an edit somebody else got in first — which is more use
        // than a generic failure would be.
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'This Arc could not be saved. Please try again shortly.';
      },
    });
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
      .pipe(takeUntilDestroyed(this._destroyRef))
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
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'That Arc could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
