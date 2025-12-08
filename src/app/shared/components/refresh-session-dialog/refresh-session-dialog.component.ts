import { Component, Inject, Optional, inject } from '@angular/core';
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
  appComponent: AppComponent;

  public dialogRef = inject(MatDialogRef<RefreshSessionDialogComponent>);
  @Optional()
  @Inject(MAT_DIALOG_DATA)
  public data!: { appComponent: AppComponent };

  constructor() {
    this.appComponent = this.data.appComponent;
  }

  onStayConnected(): void {
    this.dialogRef.close(true);
  }

  onLogout(): void {
    this.appComponent.logout();
    this.dialogRef.close(false);
  }
}
