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
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagedCharacter } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CharacterService } from '../../character.service';
import {
  CharacterPanelVm,
  buildCharacterPanelVm,
} from '../../character-panel.utility';
import { StorytimeCastEntryComponent } from '../../shared/cast-entry/cast-entry.component';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';

/**
 * The cast of one of the creator's Stories, with the actions on each.
 */
@Component({
  selector: 'app-character-list',
  templateUrl: './character-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    StorytimeCastEntryComponent,
  ],
})
export class CharacterListComponent implements OnInit {
  /** The cast, in display order. */
  characters: ManagedCharacter[] = [];

  /**
   * The same cast as the panels render them.
   *
   * Built once a load lands rather than read off the Character in the
   * template, so the facts under a name are worked out when they change
   * rather than on every check.
   */
  entries: CharacterPanelVm<ManagedCharacter>[] = [];

  /** The Story this cast belongs to. */
  storyId = '';

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _characterService = inject(CharacterService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new StorytimeActionRunner(this, () =>
    this.load(),
  );

  /**
   * Loads the cast of the Story named in the route.
   */
  ngOnInit(): void {
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    this.load();
  }

  /**
   * Moves a Character one place earlier in the cast list.
   *
   * @param index - The Character's current position.
   */
  moveUp(index: number): void {
    this.move(index, index - 1);
  }

  /**
   * Moves a Character one place later in the cast list.
   *
   * @param index - The Character's current position.
   */
  moveDown(index: number): void {
    this.move(index, index + 1);
  }

  /**
   * Deletes a Character and refreshes the list.
   *
   * @param character - The Character to delete.
   */
  remove(character: ManagedCharacter): void {
    this._actions.run(this._characterService.deleteCharacter(character.id));
  }

  /**
   * Swaps two Characters and saves the new order.
   *
   * The whole order is sent, because that is what the server accepts: a
   * partial list would leave everyone else at positions that no longer mean
   * anything relative to the two that moved.
   *
   * @param from - The position moving.
   * @param to - Where it is moving to.
   */
  private move(from: number, to: number): void {
    if (to < 0 || to >= this.characters.length) {
      return;
    }

    const reordered = [...this.characters];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    this._actions.run(
      this._characterService.reorderCharacters(
        this.storyId,
        reordered.map(character => character.id),
      ),
    );
  }

  /**
   * Loads the cast.
   */
  private load(): void {
    this.isLoading = true;

    this._characterService
      .getMyCharacters(this.storyId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: characters => {
          this.characters = characters;
          this.entries = characters.map(buildCharacterPanelVm);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 403
              ? 'This is not your Story.'
              : 'The cast could not be loaded. Please try again shortly.';
        },
      });
  }
}
