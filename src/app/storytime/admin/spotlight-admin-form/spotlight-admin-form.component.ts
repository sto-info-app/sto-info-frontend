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
  CreateSpotlightRequest,
  ManagedSpotlight,
  SpotlightEntityType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SpotlightService } from '../../spotlight.service';

/**
 * The fields of a selection an editor may change after it exists.
 *
 * Spelled out rather than reusing the request type so the form's own output is
 * complete: every field is present, and the optional ones carry null when the
 * editor has cleared them.
 */
interface SpotlightFields {
  headline: string;
  summary: string;
  slug?: string;
  selectionReason: string | null;
  overrideImageId: string | null;
  overrideImageAlt: string | null;
  displayPriority: number;
  startsAt: string;
  endsAt: string | null;
}

/**
 * Writing a Spotlight selection.
 *
 * The same form drafts and edits, because the fields are identical and keeping
 * two would guarantee they drift.
 *
 * What is featured can be chosen when drafting but not changed afterwards: a
 * live entry repointed from one Story to another would change what readers are
 * looking at while keeping the words that praised something else.
 */
@Component({
  selector: 'app-spotlight-admin-form',
  templateUrl: './spotlight-admin-form.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class SpotlightAdminFormComponent implements OnInit {
  /** The form backing the editor. */
  form!: FormGroup;

  /** The entry being edited, or null when drafting a new one. */
  entry: ManagedSpotlight | null = null;

  /** Whether the editor is still loading an existing entry. */
  isLoading = false;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when saving failed. */
  errorMessage = '';

  /** The kinds of work that may be featured. */
  readonly entityTypes = Object.values(SpotlightEntityType);

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _spotlightService = inject(SpotlightService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Builds the form and loads the entry when editing an existing one.
   */
  ngOnInit(): void {
    this.form = this._formBuilder.group({
      entityType: [SpotlightEntityType.STORY],
      targetId: ['', Validators.required],
      headline: ['', [Validators.required, Validators.maxLength(200)]],
      summary: ['', Validators.required],
      slug: ['', Validators.maxLength(220)],
      selectionReason: [''],
      overrideImageId: [''],
      overrideImageAlt: [''],
      displayPriority: [0, [Validators.min(0)]],
      startsAt: ['', Validators.required],
      endsAt: [''],
    });

    const spotlightId = this._route.snapshot.paramMap.get('spotlightId');

    if (spotlightId) {
      this.loadEntry(spotlightId);
    }
  }

  /**
   * Whether the editor is drafting a new entry rather than editing one.
   *
   * @returns True when there is no entry loaded.
   */
  get isNew(): boolean {
    return this.entry === null;
  }

  /**
   * How to describe the identifier field for the chosen kind of work.
   *
   * @returns The field label.
   */
  get targetLabel(): string {
    return this.form.controls['entityType'].value === SpotlightEntityType.ARC
      ? 'Arc ID'
      : 'Story ID';
  }

  /**
   * Saves the entry, creating it when new and updating it otherwise.
   */
  save(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const request: Observable<ManagedSpotlight> = this.entry
      ? this._spotlightService.update(this.entry.id, this.buildChanges())
      : this._spotlightService.create(this.buildDraft());

    request.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.isSaving = false;
        void this._router.navigate([
          '/',
          this.appRoutes.STORYTIME,
          'manage',
          'spotlight',
        ]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        // The server names the specific problem — work that cannot be
        // featured, or a period that ends before it starts — which is more use
        // to an editor than a generic failure would be.
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'This selection could not be saved. Please try again shortly.';
      },
    });
  }

  /**
   * Builds the creation request from the form.
   *
   * @returns The draft to send.
   */
  private buildDraft(): CreateSpotlightRequest {
    const value = this.form.getRawValue() as Record<string, string | number>;
    const entityType = value['entityType'] as SpotlightEntityType;
    const targetId = String(value['targetId']).trim();
    const changes = this.buildChanges();

    return {
      ...changes,
      entityType,
      storyId: entityType === SpotlightEntityType.STORY ? targetId : undefined,
      arcId: entityType === SpotlightEntityType.ARC ? targetId : undefined,
    };
  }

  /**
   * Builds the editable fields from the form.
   *
   * Optional text is sent as null rather than an empty string, so clearing a
   * field means "there is none" rather than "there is one, and it is blank".
   *
   * @returns The changes to send.
   */
  private buildChanges(): SpotlightFields {
    const value = this.form.getRawValue() as Record<string, string | number>;

    return {
      headline: String(value['headline']).trim(),
      summary: String(value['summary']).trim(),
      slug: String(value['slug']).trim() || undefined,
      selectionReason: String(value['selectionReason']).trim() || null,
      overrideImageId: String(value['overrideImageId']).trim() || null,
      overrideImageAlt: String(value['overrideImageAlt']).trim() || null,
      displayPriority: Number(value['displayPriority']),
      startsAt: new Date(String(value['startsAt'])).toISOString(),
      endsAt: value['endsAt']
        ? new Date(String(value['endsAt'])).toISOString()
        : null,
    };
  }

  /**
   * Loads an existing entry into the form.
   *
   * @param spotlightId - The entry to load.
   */
  private loadEntry(spotlightId: string): void {
    this.isLoading = true;

    this._spotlightService
      .getOne(spotlightId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: entry => {
          this.entry = entry;
          this.form.patchValue({
            entityType: entry.entityType,
            // Exactly one of these is set: the database enforces it.
            targetId: entry.storyId ?? entry.arcId,
            headline: entry.headline,
            summary: entry.summary,
            slug: entry.slug,
            selectionReason: entry.selectionReason ?? '',
            overrideImageId: entry.overrideImageId ?? '',
            overrideImageAlt: entry.overrideImageAlt ?? '',
            displayPriority: entry.displayPriority,
            startsAt: this.toInputValue(entry.startsAt),
            endsAt: this.toInputValue(entry.endsAt),
          });
          // What is featured is fixed once the entry exists.
          this.form.controls['entityType'].disable();
          this.form.controls['targetId'].disable();
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'That selection could not be loaded.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Formats a stored timestamp for a datetime-local input.
   *
   * The input works in the editor's own time and is read back the same way, so
   * the value written into it has to be local rather than UTC. Formatting it
   * as UTC would move every schedule by the offset each time somebody saved a
   * selection without touching the dates at all.
   *
   * @param value - The timestamp, if any.
   * @returns The input value, empty when there is no timestamp.
   */
  private toInputValue(value: string | null): string {
    if (!value) {
      return '';
    }

    const moment = new Date(value);
    const local = new Date(
      moment.getTime() - moment.getTimezoneOffset() * 60000,
    );

    return local.toISOString().slice(0, 16);
  }
}
