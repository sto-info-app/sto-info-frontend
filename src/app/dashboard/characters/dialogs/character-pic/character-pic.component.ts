import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { progressBarAnimation } from 'src/app/shared/animation/progress-bar.animation';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';

@Component({
  selector: 'app-character-pic',
  templateUrl: './character-pic.component.html',
  styleUrls: ['./character-pic.component.scss'],
  standalone: true,
  animations: [progressBarAnimation],
  imports: [
    ImageCropperComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CharacterPicComponent {
  errorMessage = '';
  isSubmitting = false;
  uploadedInvalidImageType = false;

  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl = '';
  croppedImageBlob: Blob | null = null;
  cropper: ImageCropperComponent | null = null;

  // Allow constants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;

  private readonly characterService = inject(CharacterService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogRef = inject(MatDialogRef<CharacterPicComponent>);
  public data = inject(MAT_DIALOG_DATA) as {
    character: Character;
  };

  /**
   * Handles file input change events and validates that the selected file is an image.
   * Implements strict validation to prevent potential XSS attacks from malicious files.
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

        // Strict validation: only allow specific safe image formats
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];

        // Get file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext =>
          fileName.endsWith(ext),
        );

        // Explicitly block SVG files (potential XSS vector)
        if (file.type.includes('svg') || fileName.endsWith('.svg')) {
          this.uploadedInvalidImageType = true;
          console.warn('SVG files are not allowed for security reasons');
          return;
        }

        // Validate MIME type and extension
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
      //NOTE(SECURITY): Using bypassSecurityTrustUrl here is safe because:
      //INFO: 1. The blob comes from ngx-image-cropper which re-encodes the image as PNG
      //INFO: 2. Input files are strictly validated (only JPEG/PNG, no SVG)
      //INFO: 3. The data URL is only used in an <img> tag which prevents script execution
      //INFO: 4. The blob is created client-side from validated user input, not from external sources
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string,
      );
    };
  }

  /**
   * Validates the cropped image and uploads it as the character's profile picture.
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
        'character-pic.png',
      );

      this.isSubmitting = true;
      this.characterService
        .updateCharacterProfilePic(this.data.character.id, formData)
        .subscribe({
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
   * Handles the event when image loading fails in the cropper.
   * Resets the cropper state and displays an appropriate error message.
   */
  loadImageFailed() {
    this.resetCropperState();

    if (this.uploadedInvalidImageType) {
      this.displayErrorMessage('Failed to load image');
    } else {
      this.displayErrorMessage('Invalid image type. Please upload an image.');
    }
  }

  /**
   * Handles HTTP errors and displays appropriate error messages.
   *
   * @param error HTTP error object.
   */
  private handleHttpError(error: { status: number }): void {
    let errMessage = '';
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

  /**
   * Validates the cropped image blob.
   *
   * @returns True if valid, false otherwise.
   */
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

  /**
   * Resets the cropper state and clears all image data.
   */
  private resetCropperState(): void {
    this.cropper = null;
    this.croppedImage = '';
    this.croppedImageBlob = null;
    this.imageChangedEvent = null;
  }

  /**
   * Displays an error message to the user for a set duration.
   *
   * @param message The error message to display.
   */
  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  /**
   * Clears the current error message.
   */
  resetErrorMessage(): void {
    this.errorMessage = '';
  }

  /**
   * Closes the dialog without saving.
   */
  onCloseClick(): void {
    this.dialogRef?.close();
  }
}
