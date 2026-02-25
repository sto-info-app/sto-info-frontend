import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { User } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
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
export class ProfilePicComponent {
  errorMessage = '';
  isSubmitting = false;
  uploadedInvalidImageType = false;

  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl = '';
  croppedImageBlob: Blob | null = null;
  cropper: ImageCropperComponent | null = null;

  // Allow constants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;

  private readonly dashboardService = inject(DashboardService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogRef = inject(
    MatDialogRef<EditPersonalDetailsComponent>,
  );
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    user: User;
  } | null;

  /**
   * Handles file input change events and validates that the selected file is an image.
   *
   * @param event File input change event.
   */
  onFileChangeEvent(event: Event): void {
    this.uploadedInvalidImageType = false;
    this.resetErrorMessage();

    this.imageChangedEvent = event;

    if (!event) {
      return;
    }

    if (event.target) {
      const target = event.target as HTMLInputElement;
      if (target.files) {
        const file = target.files[0];
        if (!file) {
          return;
        }

        if (!file.type.includes('image')) {
          this.uploadedInvalidImageType = true;
          return;
        }
      }
    }
  }

  /**
   * Updates the cropped image preview and backing Blob when the cropper emits a new crop.
   *
   * @param event Cropper output event containing the cropped image data.
   */
  onImageCropped(event: ImageCroppedEvent) {
    if (!event.blob) {
      console.error('Cropped image is not defined correctly');
      return;
    }

    this.croppedImageBlob = event.blob;

    const reader = new FileReader();
    reader.readAsDataURL(event.blob);
    reader.onloadend = () => {
      //NOTE: The input to bypassSecurityTrustUrl is from a trusted source (FileReader) and is validated to be an image blob.
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string,
      );
    };
  }

  /**
   * Validates the cropped image and uploads it as the user's profile picture.
   * Displays appropriate error messages for invalid state or server errors.
   */
  onUploadImageClick() {
    if (!this.croppedImageBlob) {
      console.error('No image to upload');
      this.displayErrorMessage('Please crop an image before uploading.');
      return;
    }

    // Check if the Blob is in PNG format
    if (this.croppedImageBlob.type !== 'image/png') {
      console.error('Cropped image is not in PNG format');
      this.displayErrorMessage('The cropped image must be in PNG format.');
      return;
    }

    // Use the Blob from the image cropper event
    try {
      const blob = this.croppedImageBlob;

      if (blob?.size > 0) {
        const formData = new FormData();
        formData.append('profilePicture', blob, 'profile-pic.png');

        this.isSubmitting = true;
        this.dashboardService.updateProfilePic(formData).subscribe({
          next: () => {
            this.dialogRef?.close({
              stayLoggedIn: true,
            });
            this.isSubmitting = false;
          },
          error: error => {
            let errMessage: string;
            if (error.status === 0) {
              console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
              errMessage = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
            } else if (error.status === 400) {
              console.error(MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT);
              errMessage = MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT;
            } else {
              console.error('Unexpected Error:', error);
              errMessage = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
            }
            this.displayErrorMessage(errMessage);
            this.isSubmitting = false;
          },
          complete: () => {
            this.isSubmitting = false;
            this.dialogRef?.close(true);
          },
        });
      } else {
        console.error('Blob is empty');
        this.displayErrorMessage('Failed to upload image.');
        this.isSubmitting = false;
      }
    } catch (error) {
      console.error('Error processing image blob:', error);
      this.displayErrorMessage('Invalid image format.');
      this.isSubmitting = false;
    }
  }

  /**
   * Resets cropper state when the image fails to load and shows an appropriate error message.
   */
  loadImageFailed() {
    this.cropper = null;
    this.croppedImage = '';
    this.croppedImageBlob = null;
    this.imageChangedEvent = null;

    if (this.uploadedInvalidImageType) {
      this.displayErrorMessage('Failed to load image');
    } else {
      this.displayErrorMessage('Invalid image type. Please upload an image.');
    }
  }

  /**
   * Displays an error message for a limited duration before clearing it.
   *
   * @param message Error message text to display.
   */
  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  /**
   * Clears the currently displayed error message.
   */
  resetErrorMessage(): void {
    this.errorMessage = '';
  }

  /**
   * Closes the profile picture dialog without returning any specific result.
   */
  onCloseClick(): void {
    this.dialogRef?.close();
  }
}
