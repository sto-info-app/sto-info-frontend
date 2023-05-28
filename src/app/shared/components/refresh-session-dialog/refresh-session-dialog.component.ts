import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-refresh-session-dialog',
  templateUrl: './refresh-session-dialog.component.html',
  styleUrls: ['./refresh-session-dialog.component.scss'],
})
export class RefreshSessionDialogComponent {
  constructor(public dialogRef: MatDialogRef<RefreshSessionDialogComponent>) {}

  onStayConnected(): void {
    this.dialogRef.close(true);
  }

  onDissmis(): void {
    this.dialogRef.close(false);
  }
}
