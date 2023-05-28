import { Component, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';

export interface DialogData {
  countdownSeconds: number;
}

@Component({
  selector: 'app-refresh-session-dialog',
  templateUrl: './refresh-session-dialog.component.html',
  styleUrls: ['./refresh-session-dialog.component.scss'],
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

  onDissmis(): void {
    this.dialogRef.close(false);
  }
}
