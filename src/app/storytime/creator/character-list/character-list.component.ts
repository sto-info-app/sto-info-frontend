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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  CopiedCharacter,
  CopiedCharacterNavigationState,
  CopyableCharacter,
  CopyableCharacterStory,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsPanelComponent } from 'src/app/shared/components/lcars-panel/lcars-panel.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CharacterService } from '../../character.service';
import {
  CharacterPanelVm,
  buildCharacterPanelVm,
} from '../../character-panel.utility';
import { StorytimeCastEntryComponent } from '../../shared/cast-entry/cast-entry.component';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { ManagedActionRunner } from 'src/app/shared/actions/managed-action.runner';

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
    LcarsPanelComponent,
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

  /** Whether the picker of Characters to copy is open (sc-1483). */
  isPickerOpen = false;

  /** Whether the picker is still loading. */
  isPickerLoading = false;

  /** The creator's other Stories, each with the Characters it offers. */
  copyable: CopyableCharacterStory[] = [];

  /** A message to show when the picker or a copy failed. */
  pickerError = '';

  /** The Character being copied, while the copy is in flight. */
  copyingId: string | null = null;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _characterService = inject(CharacterService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new ManagedActionRunner(this, () => this.load());
  private readonly _confirm = new ConfirmPrompt();

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
   * Deletes a Character, once the creator has agreed to lose them.
   *
   * @param character - The Character to delete.
   */
  remove(character: ManagedCharacter): void {
    this._confirm
      .askToDestroy({
        title: 'Delete Character',
        question:
          'Are you sure you want to delete this Character from the cast?',
        subject: character.name,
        consequence:
          'Their portrait, biography and Chapter appearances go with them, and this cannot be undone.',
        confirmText: 'Delete Character',
      })
      .subscribe(confirmed => {
        if (confirmed) {
          this._actions.run(
            this._characterService.deleteCharacter(character.id),
          );
        }
      });
  }

  /**
   * Opens the picker of Characters to copy from another Story, or closes it.
   *
   * What it offers is asked for each time it opens, so a Character added in
   * another tab since is there to pick.
   */
  togglePicker(): void {
    this.isPickerOpen = !this.isPickerOpen;

    if (!this.isPickerOpen) {
      return;
    }

    this.isPickerLoading = true;
    this.pickerError = '';

    this._characterService
      .getCopyableCharacters(this.storyId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isPickerLoading = false;
        }),
      )
      .subscribe({
        next: stories => {
          this.copyable = stories;
        },
        error: () => {
          this.copyable = [];
          this.pickerError =
            'Your other Stories could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Copies a Character into this Story, then opens the copy's editor.
   *
   * The editor is told about the original's portrait, which the copy does not
   * take with it, so it can offer the picture for downloading and uploading
   * again.
   *
   * @param character - The Character to copy.
   */
  copy(character: CopyableCharacter): void {
    if (this.copyingId !== null) {
      return;
    }

    this.copyingId = character.id;
    this.pickerError = '';

    this._characterService
      .copyCharacter(this.storyId, character.id)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.copyingId = null;
        }),
      )
      .subscribe({
        next: copied => this.openCopy(copied),
        error: (error: HttpErrorResponse) => {
          this.pickerError = this.copyFailureMessage(error);
        },
      });
  }

  /**
   * Opens the editor of a fresh copy.
   *
   * @param copied - The copy, and the portrait it left behind.
   */
  private openCopy(copied: CopiedCharacter): void {
    const state: CopiedCharacterNavigationState = {
      copiedCharacterId: copied.character.id,
      originalPortrait: copied.originalPortrait,
    };

    void this._router.navigate(
      ['/', APP_ROUTES.STORYTIME, 'manage', 'characters', copied.character.id],
      { state },
    );
  }

  /**
   * Says why a copy failed.
   *
   * @param error - What the server answered.
   * @returns The message to show.
   */
  private copyFailureMessage(error: HttpErrorResponse): string {
    const said = (error.error as { message?: unknown } | null)?.message;

    if (error.status === 400 && typeof said === 'string') {
      return said;
    }

    if (error.status === 403) {
      return 'You may no longer manage the cast of one of those Stories.';
    }

    return 'That Character could not be copied. Please try again shortly.';
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
