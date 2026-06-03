import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly data = inject<{ appComponent: AppComponent } | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  appComponent: AppComponent | null = this.data?.appComponent ?? null;

  /**
   * Subscribes to authentication changes so the dialog closes when the user logs out.
   */
  ngOnInit(): void {
    // Automatically close the dialog if the user is logged out elsewhere
    this.authService.isAuthenticated$
      .pipe(
        filter(isLoggedIn => !isLoggedIn),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.dialogRef.close();
      });
  }

  /**
   * Cleans up dialog subscriptions.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
