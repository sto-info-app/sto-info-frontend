import { Component, Inject, Optional } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';
import { LcarsWarningMessageComponent } from '../lcars-warning-message/lcars-warning-message.component';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';

@Component({
  selector: 'app-refresh-session-dialog',
  templateUrl: './refresh-session-dialog.component.html',
  styleUrls: ['./refresh-session-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, LcarsWarningMessageComponent, TimeFormatPipe],
})
export class RefreshSessionDialogComponent {
  appComponent: AppComponent;

  constructor(
    public dialogRef: MatDialogRef<RefreshSessionDialogComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { appComponent: AppComponent },
  ) {
    this.appComponent = data.appComponent;
  }

  onStayConnected(): void {
    this.dialogRef.close(true);
  }

  onLogout(): void {
    this.appComponent.logout();
    this.dialogRef.close(false);
  }
}
