import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  ReactionSummary,
  StorytimeReaction,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReactionService } from '../../reaction.service';

/**
 * Thumbs up and down on a Story, Chapter or Arc.
 *
 * A signed-out reader sees the rating and cannot change it: the buttons are
 * disabled and say why, rather than being hidden. Hiding them would make the
 * number look like a fact about the page rather than something readers decide.
 *
 * Pressing what is already pressed takes it back, which is what a pressed
 * button means when it is pressed a second time.
 */
@Component({
  selector: 'app-reaction-control',
  templateUrl: './reaction-control.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ReactionControlComponent implements OnInit {
  /** What is being reacted to. */
  @Input({ required: true }) targetType!: StorytimeTargetType;

  /** The thing being reacted to. */
  @Input({ required: true }) targetId!: string;

  /** How the thing stands, once it has been read. */
  summary: ReactionSummary | null = null;

  /** Whether a change is in flight, so the buttons cannot be spammed. */
  isSaving = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** The reactions, so the template does not spell out the enum. */
  readonly reactions = StorytimeReaction;

  private readonly _reactionService = inject(ReactionService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether the reader may react at all.
   *
   * @returns True when somebody is signed in.
   */
  get canReact(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Reads how the thing stands.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether the reader chose a given reaction.
   *
   * @param reaction - The reaction.
   * @returns True when that is what they chose.
   */
  isMine(reaction: StorytimeReaction): boolean {
    return this.summary?.mine === reaction;
  }

  /**
   * Leaves a reaction, or takes back the one already left.
   *
   * @param reaction - What the reader pressed.
   */
  react(reaction: StorytimeReaction): void {
    if (!this.canReact || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Pressing what is already pressed takes it back. The server treats a
    // repeated reaction the same way; asking explicitly just makes the button
    // read as a toggle rather than as a resend.
    const change: Observable<ReactionSummary> = this.isMine(reaction)
      ? this._reactionService.removeReaction(this.targetType, this.targetId)
      : this._reactionService.react(this.targetType, this.targetId, reaction);

    change
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: summary => {
          this.summary = summary;
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That could not be recorded. Try again.';
          this.isSaving = false;
        },
      });
  }

  /**
   * Reads the current counts.
   */
  private load(): void {
    this._reactionService
      .getSummary(this.targetType, this.targetId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: summary => (this.summary = summary),
        error: () => (this.summary = null),
      });
  }
}
