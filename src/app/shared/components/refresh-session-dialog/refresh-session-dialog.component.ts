import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';
import { LcarsWarningMessageComponent } from '../lcars-warning-message/lcars-warning-message.component';

@Component({
  selector: 'app-refresh-session-dialog',
  templateUrl: './refresh-session-dialog.component.html',
  styleUrls: ['./refresh-session-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, LcarsWarningMessageComponent, TimeFormatPipe],
})
export class RefreshSessionDialogComponent {
  public dialogRef = inject(MatDialogRef<RefreshSessionDialogComponent>);
  private readonly data = inject<{ appComponent: AppComponent } | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  appComponent: AppComponent | null = this.data?.appComponent ?? null;

  onStayConnected(): void {
    this.dialogRef.close(true);
  }

  onLogout(): void {
    this.appComponent?.logout();
    this.dialogRef.close(false);
  }
}
