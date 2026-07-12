import { inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import {
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';

export abstract class ImageCropperBaseComponent {
  protected abstract readonly _dialogRef: MatDialogRef<unknown>;

  protected readonly _sanitizer = inject(DomSanitizer);

  errorMessage = '';
  isSubmitting = false;
  uploadedInvalidImageType = false;

  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl = '';
  croppedImageBlob: Blob | null = null;
  cropper: ImageCropperComponent | null = null;

  showErrorMilliseconds = MILLISECONDS_SHOW_ERROR_MSG;

  onFileChangeEvent(event: Event): void {
    this.uploadedInvalidImageType = false;
    this.resetErrorMessage();
    this.imageChangedEvent = event;

    if (!event?.target) return;

    const target = event.target as HTMLInputElement;
    if (!target.files) return;

    const file = target.files[0];
    if (!file) return;

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
    }
  }

  onImageCropped(event: ImageCroppedEvent): void {
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
      this.croppedImage = this._sanitizer.bypassSecurityTrustUrl(
        reader.result as string,
      );
    };
  }

  loadImageFailed(): void {
    this.resetCropperState();

    if (this.uploadedInvalidImageType) {
      this.displayErrorMessage('Failed to load image');
    } else {
      this.displayErrorMessage('Invalid image type. Please upload an image.');
    }
  }

  onCloseClick(): void {
    this._dialogRef?.close();
  }

  displayErrorMessage(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  resetErrorMessage(): void {
    this.errorMessage = '';
  }

  protected validateCroppedImage(): boolean {
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

  protected handleHttpError(error: { status: number }): void {
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

  protected resetCropperState(): void {
    this.cropper = null;
    this.croppedImage = '';
    this.croppedImageBlob = null;
    this.imageChangedEvent = null;
  }
}
