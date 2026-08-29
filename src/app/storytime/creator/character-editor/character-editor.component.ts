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
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CharacterRequest,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CharacterService } from '../../character.service';
import { EditorActionsComponent } from '../../shared/editor-actions/editor-actions.component';
import { MarkdownHintComponent } from '../../shared/markdown-hint/markdown-hint.component';

/** How many traits one Character may carry, matching the server. */
export const MAX_CHARACTER_TRAITS = 20;

/**
 * Creating and editing a Character.
 *
 * The same component serves both, because the form is identical and the only
 * difference is whether there is an existing Character behind it. Splitting
 * them would mean keeping two copies of the same fields in step.
 */
@Component({
  selector: 'app-character-editor',
  templateUrl: './character-editor.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
    MarkdownHintComponent,
    EditorActionsComponent,
  ],
})
export class CharacterEditorComponent implements OnInit {
  /** The Character being edited, or null when creating one. */
  character: ManagedCharacter | null = null;

  /** The Story the Character belongs to. */
  storyId = '';

  /** Whether the editor is still loading. */
  isLoading = true;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /** The most traits the form will offer. */
  readonly maxTraits = MAX_CHARACTER_TRAITS;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _characterService = inject(CharacterService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The Character form.
   *
   * Non-nullable throughout: a text field that has been cleared holds an empty
   * string, never null, so the payload never has to guess which of the two a
   * blank field meant.
   */
  readonly form = this._formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', Validators.maxLength(220)],
    shortBio: ['', Validators.maxLength(500)],
    biographySource: [''],
    species: ['', Validators.maxLength(100)],
    faction: ['', Validators.maxLength(100)],
    rank: ['', Validators.maxLength(100)],
    occupation: ['', Validators.maxLength(150)],
    affiliation: ['', Validators.maxLength(200)],
    shipAssignment: ['', Validators.maxLength(200)],
    portraitImageId: ['', Validators.maxLength(100)],
    portraitImageAlt: ['', Validators.maxLength(300)],
    isPrimary: [false],
    traits: this._formBuilder.array<FormControl<string>>([]),
  });

  /**
   * The trait rows.
   *
   * @returns The traits form array.
   */
  get traits(): FormArray<FormControl<string>> {
    return this.form.controls.traits;
  }

  /**
   * Whether the form is creating a new Character rather than editing one.
   *
   * @returns True when there is nothing behind the form yet.
   */
  get isCreating(): boolean {
    return this.character === null;
  }

  /**
   * Loads the Character named in the route, or prepares an empty form.
   */
  ngOnInit(): void {
    const characterId = this._route.snapshot.paramMap.get('characterId');
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';

    if (!characterId) {
      this.isLoading = false;
      return;
    }

    this._characterService
      .getMyCharacter(characterId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: character => {
          this.character = character;
          this.storyId = character.storyId;
          this.fill(character);
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Character could not be found.'
              : 'This Character could not be loaded. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Adds an empty trait row.
   */
  addTrait(): void {
    if (this.traits.length >= MAX_CHARACTER_TRAITS) {
      return;
    }

    this.traits.push(
      this._formBuilder.nonNullable.control('', Validators.maxLength(60)),
    );
  }

  /**
   * Removes a trait row.
   *
   * @param index - The row to remove.
   */
  removeTrait(index: number): void {
    this.traits.removeAt(index);
  }

  /**
   * Saves the Character.
   */
  save(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this.request()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: saved => {
          this.character = saved;
          this.isSaving = false;
          void this._router.navigate([
            '/',
            APP_ROUTES.STORYTIME,
            'manage',
            'stories',
            saved.storyId,
            'characters',
          ]);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 409
              ? 'This Character has changed since you opened it. Reload and try again.'
              : 'This Character could not be saved. Please try again shortly.';
          this.isSaving = false;
        },
      });
  }

  /**
   * Builds the create or update request.
   *
   * @returns The request's observable.
   */
  private request(): Observable<ManagedCharacter> {
    const payload = this.payload();

    return this.character
      ? this._characterService.updateCharacter(this.character.id, {
          ...payload,
          version: this.character.version,
        })
      : this._characterService.createCharacter(this.storyId, payload);
  }

  /**
   * Builds the payload from the form.
   *
   * Blank fields are omitted rather than sent as empty strings, so a field
   * left alone stays as it was instead of being cleared by accident.
   *
   * @returns The Character request.
   */
  private payload(): CharacterRequest {
    const value = this.form.getRawValue();
    const payload: CharacterRequest = {
      name: value.name,
      isPrimary: value.isPrimary,
      traits: value.traits
        .map(trait => trait.trim())
        .filter(trait => trait.length > 0),
    };

    const optional = [
      'slug',
      'shortBio',
      'biographySource',
      'species',
      'faction',
      'rank',
      'occupation',
      'affiliation',
      'shipAssignment',
      'portraitImageId',
      'portraitImageAlt',
    ] as const;

    for (const field of optional) {
      const entry = value[field].trim();

      if (entry.length > 0) {
        payload[field] = entry;
      }
    }

    return payload;
  }

  /**
   * Fills the form from a loaded Character.
   *
   * @param character - The Character to show.
   */
  private fill(character: ManagedCharacter): void {
    this.form.patchValue({
      name: character.name,
      slug: character.slug,
      shortBio: character.shortBio ?? '',
      biographySource: character.biographySource,
      species: character.species ?? '',
      faction: character.faction ?? '',
      rank: character.rank ?? '',
      occupation: character.occupation ?? '',
      affiliation: character.affiliation ?? '',
      shipAssignment: character.shipAssignment ?? '',
      portraitImageId: character.portraitImageId ?? '',
      portraitImageAlt: character.portraitImageAlt ?? '',
      isPrimary: character.isPrimary,
    });

    this.traits.clear();

    for (const trait of character.traits ?? []) {
      this.traits.push(
        this._formBuilder.nonNullable.control(trait, Validators.maxLength(60)),
      );
    }
  }
}
