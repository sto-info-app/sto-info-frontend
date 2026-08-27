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
import { AuthService } from 'src/app/core/auth/auth.service';
import { FollowState, FollowTargetKind } from 'src/app/models/storytime.models';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { FollowService } from '../../follow.service';

/**
 * Following a creator, a Story or an Arc.
 *
 * Nothing is shown to a signed-out reader: a follow only exists for somebody
 * with an account, and a button that always says "sign in first" is a nag
 * rather than a control. This differs deliberately from the rating buttons,
 * which stay visible because their number belongs to everybody.
 */
@Component({
  selector: 'app-follow-button',
  templateUrl: './follow-button.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class FollowButtonComponent implements OnInit {
  /** What kind of thing is being followed. */
  @Input({ required: true }) kind!: FollowTargetKind;

  /** The thing being followed. */
  @Input({ required: true }) targetId!: string;

  /** What the button says it is for, such as "this Story". */
  @Input() label = 'this';

  /** Whether the reader follows it, and how many others do. */
  state: FollowState | null = null;

  /** Whether a change is in flight. */
  isSaving = false;

  /** A message to show when something failed. */
  errorMessage = '';

  private readonly _followService = inject(FollowService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether there is anything to show at all.
   *
   * @returns True when somebody is signed in.
   */
  get isVisible(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Reads whether the reader already follows the thing.
   */
  ngOnInit(): void {
    if (!this.isVisible) {
      return;
    }

    this._followService
      .getFollowState(this.kind, this.targetId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: state => (this.state = state),
        error: () => (this.state = null),
      });
  }

  /**
   * Follows the thing, or stops.
   */
  toggle(): void {
    if (this.isSaving || !this.state) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const change = this.state.isFollowing
      ? this._followService.unfollow(this.kind, this.targetId)
      : this._followService.follow(this.kind, this.targetId);

    change
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: state => {
          this.state = state;
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That could not be saved. Try again.';
          this.isSaving = false;
        },
      });
  }
}
