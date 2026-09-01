import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { User } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { EditPersonalDetailsComponent } from '../edit-personal-details/edit-personal-details.component';

@Component({
  selector: 'app-profile-pic',
  templateUrl: './profile-pic.component.html',
  styleUrls: ['./profile-pic.component.scss'],
  standalone: true,
  imports: [
    ImageCropperComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ProfilePicComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<EditPersonalDetailsComponent>,
  );
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    user: User;
  } | null;

  private readonly _dashboardService = inject(DashboardService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  onUploadImageClick(): void {
    try {
      if (!this.validateCroppedImage()) return;

      const formData = new FormData();
      formData.append(
        'profilePicture',
        this.croppedImageBlob!,
        'profile-pic.png',
      );

      this.isSubmitting = true;
      this._dashboardService
        .updateProfilePic(formData)
        .pipe(observeInZone(this._ngZone, this._cdr))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this._dialogRef?.close(true);
          },
          error: error => {
            this.handleHttpError(error);
            this.isSubmitting = false;
          },
        });
    } catch (error) {
      console.error('Error processing image blob:', error);
      this.displayErrorMessage('Invalid image format.');
      this.isSubmitting = false;
    }
  }
}
