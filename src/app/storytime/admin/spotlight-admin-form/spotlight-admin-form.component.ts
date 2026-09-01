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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
  CreateSpotlightRequest,
  ManagedSpotlight,
  SearchHit,
  SpotlightEntityType,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import {
  LcarsSearchDialogComponent,
  LcarsSearchDialogData,
} from 'src/app/shared/components/lcars-search-dialog/lcars-search-dialog.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { SearchService } from '../../search.service';
import { EditorActionsComponent } from '../../shared/editor-actions/editor-actions.component';
import { ImageManagerComponent } from '../../shared/image-manager/image-manager.component';
import { SpotlightService } from '../../spotlight.service';
import { StorytimeImageSlot } from '../../storytime-image.constants';

/** The details a chosen work can fill in for the editor. */
type SeededField = 'headline' | 'summary';

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
  overrideImageAlt?: string;
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
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    ImageManagerComponent,
    EditorActionsComponent,
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

  /** Human-readable title of the selected work (display only). */
  selectedTitle = '';

  /** The kinds of work that may be featured. */
  readonly entityTypes = Object.values(SpotlightEntityType);

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _spotlightService = inject(SpotlightService);
  private readonly _searchService = inject(SearchService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The details last filled in from a chosen work.
   *
   * Kept so a later choice can replace what an earlier one wrote while leaving
   * anything the editor typed themselves alone.
   */
  private _seeded: Record<SeededField, string> | null = null;

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
      overrideImageAlt: [''],
      displayPriority: [0, [Validators.min(0)]],
      startsAt: ['', Validators.required],
      endsAt: [''],
    });

    this.form.controls['entityType'].valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        if (this.isNew) {
          this.form.controls['targetId'].setValue('');
          this.selectedTitle = '';
          this.seedDetails(null);
        }
      });

    const spotlightId = this._route.snapshot.paramMap.get('spotlightId');

    if (spotlightId) {
      this.loadEntry(spotlightId);
    }
  }

  /**
   * Opens the search-and-select dialog for Stories or Arcs.
   *
   * The dialog is seeded with the entity type the editor has chosen, so a
   * Story search never returns Arcs and vice versa.
   *
   * Choosing a work also fills in the headline and summary readers will see
   * from the work's own, as a draft to write over rather than a blank page.
   */
  openPicker(): void {
    const entityType = this.form.controls['entityType']
      .value as SpotlightEntityType;
    const isArc = entityType === SpotlightEntityType.ARC;
    const data: LcarsSearchDialogData<SearchHit> = {
      title: isArc ? 'Select an Arc' : 'Select a Story',
      searchFn: (term, page) =>
        this._searchService.search(term, {
          types: [isArc ? StorytimeTargetType.ARC : StorytimeTargetType.STORY],
          page,
          pageSize: 5,
        }),
      resultLabel: hit => hit.title,
      resultSublabel: hit => hit.summary,
      pageSize: 5,
    };

    this._dialog
      .open(LcarsSearchDialogComponent<SearchHit>, { data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((hit?: SearchHit) => {
        if (hit) {
          this.form.controls['targetId'].setValue(hit.id);
          this.selectedTitle = hit.title;
          this.seedDetails(hit);
        }
      });
  }

  /**
   * Fills the reader-facing details in from the work that was chosen.
   *
   * @param hit - The chosen work, or null when the choice was cleared.
   */
  private seedDetails(hit: SearchHit | null): void {
    const seed: Record<SeededField, string> = {
      headline: hit?.title ?? '',
      summary: hit?.summary ?? '',
    };

    this.applySeed('headline', seed.headline);
    this.applySeed('summary', seed.summary);
    this._seeded = seed;
  }

  /**
   * Writes one seeded detail into the form, unless the editor wrote it.
   *
   * A field is filled while it is empty or still holds what the last choice
   * put there. Words an editor typed themselves survive changing the
   * selection: the point of the seed is to save typing, not to overwrite it.
   *
   * @param field - The field to fill.
   * @param value - What the chosen work calls it.
   */
  private applySeed(field: SeededField, value: string): void {
    const current = String(this.form.controls[field].value);

    if (current === '' || current === this._seeded?.[field]) {
      this.form.controls[field].setValue(value);
    }
  }

  /**
   * Whether the entry carries editorial artwork of its own.
   *
   * @returns True when an override image has been uploaded.
   */
  get hasArtwork(): boolean {
    return Boolean(this.entry?.overrideImageUrl);
  }

  /** The artwork slots a Spotlight entry carries. */
  readonly imageSlots = StorytimeImageSlot;

  /**
   * Takes the entry back from an artwork change.
   *
   * @param updated - The entry as the server now holds it.
   */
  onImageChanged(updated: unknown): void {
    const entry = updated as ManagedSpotlight;

    this.entry = entry;
    this.form.patchValue({
      overrideImageAlt: entry.overrideImageAlt ?? '',
    });
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
   * How to describe the field naming the work that is featured.
   *
   * The field shows what the work is called. Its identifier stays in the form
   * and out of sight: an editor chooses work by name, and a row of identifiers
   * is a row nobody can read.
   *
   * @returns The field label.
   */
  get targetLabel(): string {
    return this.form.controls['entityType'].value === SpotlightEntityType.ARC
      ? 'Featured Arc'
      : 'Featured Story';
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

    request
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
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
    const description = String(value['overrideImageAlt']).trim();

    return {
      headline: String(value['headline']).trim(),
      summary: String(value['summary']).trim(),
      slug: String(value['slug']).trim() || undefined,
      selectionReason: String(value['selectionReason']).trim() || null,
      // Sent only when there is artwork to describe. The server refuses a
      // description of an empty slot, because it would be read out over
      // whatever picture was uploaded into that slot next.
      ...(this.hasArtwork && description
        ? { overrideImageAlt: description }
        : {}),
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
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: entry => {
          this.entry = entry;
          // The server resolves the work an entry features unless it can no
          // longer be shown, which is the one case an editor is left with
          // nothing to read.
          this.selectedTitle = entry.story?.title ?? entry.arc?.title ?? '';
          this.form.patchValue({
            entityType: entry.entityType,
            // Exactly one of these is set: the database enforces it.
            targetId: entry.storyId ?? entry.arcId,
            headline: entry.headline,
            summary: entry.summary,
            slug: entry.slug,
            selectionReason: entry.selectionReason ?? '',
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
