import { Component, inject } from '@angular/core';
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
import { ImageCropperBaseComponent } from 'src/app/dashboard/base/image-cropper-base.component';
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
  protected override readonly dialogRef = inject(
    MatDialogRef<EditPersonalDetailsComponent>,
  );
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    user: User;
  } | null;

  private readonly dashboardService = inject(DashboardService);

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
      this.dashboardService.updateProfilePic(formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.dialogRef?.close(true);
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
