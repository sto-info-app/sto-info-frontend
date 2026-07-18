import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Subject, filter, takeUntil } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';
import { LcarsWarningMessageComponent } from '../lcars-warning-message/lcars-warning-message.component';

@Component({
  selector: 'app-refresh-session-dialog',
  templateUrl: './refresh-session-dialog.component.html',
  styleUrls: ['./refresh-session-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, LcarsWarningMessageComponent, TimeFormatPipe],
})
export class RefreshSessionDialogComponent implements OnInit, OnDestroy {
  public dialogRef = inject(MatDialogRef<RefreshSessionDialogComponent>);
  private readonly _authService = inject(AuthService);
  private readonly _zone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();
  private readonly _data = inject<{ appComponent: AppComponent } | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  appComponent: AppComponent | null = this._data?.appComponent ?? null;

  /**
   * Remaining seconds before automatic logout, displayed in the countdown.
   *
   * @remarks Owned by the dialog so it refreshes even though the surrounding
   * CDK overlay (`MatDialogContainer`) uses OnPush change detection.
   */
  countdown = this._authService.getSecondsUntilLoginSessionExpiry();

  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Subscribes to authentication changes so the dialog closes when the user logs out,
   * and starts the countdown that drives the auto-logout timer display.
   */
  ngOnInit(): void {
    // Automatically close the dialog if the user is logged out elsewhere
    this._authService.isAuthenticated$
      .pipe(
        filter(isLoggedIn => !isLoggedIn),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.dialogRef.close();
      });

    this.startCountdown();
  }

  /**
   * Cleans up dialog subscriptions and the countdown timer.
   */
  ngOnDestroy(): void {
    this.stopCountdown();
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Ticks the auto-logout countdown once per second and re-renders the dialog.
   *
   * @remarks The value is recomputed from the stored session expiry rather than
   * decremented, so it stays accurate even if the tab is throttled. Each tick
   * triggers change detection explicitly because the dialog is rendered inside
   * an OnPush CDK overlay that the parent's change detection does not reach.
   */
  private startCountdown(): void {
    this.intervalId = globalThis.setInterval(() => {
      this._zone.run(() => {
        this.countdown = this._authService.getSecondsUntilLoginSessionExpiry();
        if (this.countdown <= 0) {
          this.stopCountdown();
        }
        this._cdr.detectChanges();
      });
    }, 1000);
  }

  /**
   * Stops the auto-logout countdown timer.
   */
  private stopCountdown(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Keeps the current session active and closes the dialog.
   */
  onStayConnected(): void {
    this.dialogRef.close(true);
  }

  /**
   * Logs out the user and closes the dialog.
   */
  onLogout(): void {
    this.appComponent?.logout();
    this.dialogRef.close(false);
  }
}
