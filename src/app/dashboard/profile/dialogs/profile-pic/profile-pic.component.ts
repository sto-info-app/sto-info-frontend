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

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext =>
          fileName.endsWith(ext),
        );

        if (file.type.includes('svg') || fileName.endsWith('.svg')) {
          this.uploadedInvalidImageType = true;
          console.warn('SVG files are not allowed for security reasons');
          return;
        }

        if (!allowedMimeTypes.includes(file.type) || !hasValidExtension) {
          this.uploadedInvalidImageType = true;
          console.warn('Invalid file type attempted:', file.type, fileName);
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
    try {
      if (!this.validateCroppedImage()) {
        return;
      }

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

  /**
   * Resets cropper state when the image fails to load and shows an appropriate error message.
   */
  loadImageFailed() {
    this.resetCropperState();

    if (this.uploadedInvalidImageType) {
      this.displayErrorMessage('Failed to load image');
    } else {
      this.displayErrorMessage('Invalid image type. Please upload an image.');
    }
  }

  private validateCroppedImage(): boolean {
    if (!this.croppedImageBlob) {
      console.error('No image to upload');
      this.displayErrorMessage('Please crop an image before uploading.');
      return false;
    }

    if (this.croppedImageBlob.type !== 'image/png') {
      console.error('Cropped image is not in PNG format');
      this.displayErrorMessage('The cropped image must be in PNG format.');
      return false;
    }

    if (this.croppedImageBlob.size === 0) {
      console.error('Blob is empty');
      this.displayErrorMessage('Failed to upload image.');
      return false;
    }

    return true;
  }

  private handleHttpError(error: { status: number }): void {
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
  }

  private resetCropperState(): void {
    this.cropper = null;
    this.croppedImage = '';
    this.croppedImageBlob = null;
    this.imageChangedEvent = null;
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
