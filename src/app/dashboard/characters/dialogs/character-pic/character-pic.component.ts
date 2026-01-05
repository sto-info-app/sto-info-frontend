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
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string,
      );
    };
  }

  /**
   * Validates the cropped image and uploads it as the character's profile picture.
   */
  onUploadImageClick() {
    if (!this.croppedImageBlob) {
      console.error('No image to upload');
      this.displayErrorMessage('Please crop an image before uploading.');
      return;
    }

    if (this.croppedImageBlob.type !== 'image/png') {
      console.error('Cropped image is not in PNG format');
      this.displayErrorMessage('The cropped image must be in PNG format.');
      return;
    }

    try {
      const blob = this.croppedImageBlob;

      if (blob?.size > 0) {
        const formData = new FormData();
        formData.append('profilePicture', blob, 'character-pic.png');

        this.isSubmitting = true;
        this.characterService
          .updateCharacterProfilePic(this.data.character.id, formData)
          .subscribe({
            next: () => {
              this.isSubmitting = false;
              this.dialogRef?.close(true);
            },
            error: error => {
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
              this.isSubmitting = false;
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

  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  resetErrorMessage(): void {
    this.errorMessage = '';
  }

  onCloseClick(): void {
    this.dialogRef?.close();
  }
}
