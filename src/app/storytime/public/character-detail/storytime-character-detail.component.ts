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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import {
  Character,
  CharacterAppearanceLink,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CharacterService } from '../../character.service';

/**
 * One Character's own page.
 *
 * The biography arrives as HTML the server has already rendered and sanitised.
 * It is trusted here rather than re-sanitised, because the server — not the
 * client — is the security boundary for Storytime content.
 */
@Component({
  selector: 'app-storytime-character-detail',
  templateUrl: './storytime-character-detail.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class StorytimeCharacterDetailComponent implements OnInit {
  /** The Character being read. */
  character: Character | null = null;

  /** The Chapters a reader can find them in. */
  appearsIn: CharacterAppearanceLink[] = [];

  /** The rendered biography, ready to insert. */
  biographyHtml: SafeHtml | null = null;

  /** The Story slug, for building links back. */
  storySlug = '';

  /** Whether the Character is still loading. */
  isLoading = true;

  /** A message to show when the Character could not be loaded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _characterService = inject(CharacterService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The profile rows worth showing.
   *
   * Built rather than listed in the template so an empty field takes no space
   * at all: a Character with only a species should show one row, not a table
   * of blanks.
   *
   * @returns The label and value of each field that has been filled in.
   */
  get profileFields(): { label: string; value: string }[] {
    const character = this.character;

    if (!character) {
      return [];
    }

    return [
      { label: 'Species', value: character.species },
      { label: 'Faction', value: character.faction },
      { label: 'Rank', value: character.rank },
      { label: 'Occupation', value: character.occupation },
      { label: 'Affiliation', value: character.affiliation },
      { label: 'Ship', value: character.shipAssignment },
    ].filter(
      (field): field is { label: string; value: string } =>
        field.value !== null && field.value.length > 0,
    );
  }

  /**
   * Loads the Character named in the route.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';
          this.storySlug = params.get('storySlug') ?? '';

          return this._characterService.getCharacter(
            this.storySlug,
            params.get('characterSlug') ?? '',
          );
        }),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: result => {
          this.character = result.character;
          this.appearsIn = result.appearsIn;
          this.biographyHtml = result.character.biographyHtml
            ? // NOSONAR - server-rendered and sanitised; see the class comment.
              this._sanitizer.bypassSecurityTrustHtml(
                result.character.biographyHtml,
              )
            : null;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Character could not be found. They may have been removed, or the Story made private.'
              : 'This Character could not be loaded. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }
}
