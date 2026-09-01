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
  croppedImageWidth = 0;
  croppedImageHeight = 0;
  cropper: ImageCropperComponent | null = null;

  showErrorMilliseconds = MILLISECONDS_SHOW_ERROR_MSG;

  /**
   * The encoding the cropper is configured to produce.
   *
   * PNG by default, because that is what the profile and character pictures
   * have always used and flat artwork loses nothing to it. A subclass whose
   * image is wide and photographic overrides this, since a 2400 x 480 banner
   * stored losslessly is several megabytes of noise.
   */
  protected outputFormat: 'png' | 'jpeg' = 'png';

  /**
   * The smallest crop the destination will accept, when it has one.
   *
   * Checked here rather than only on the server so that somebody who has just
   * chosen a picture is told it is too small while they are still looking at
   * it, instead of after an upload that was never going to be kept.
   */
  protected minimumCroppedWidth = 0;

  /** The shortest crop the destination will accept, when it has one. */
  protected minimumCroppedHeight = 0;

  /**
   * The crop width the destination would rather have, when it has one.
   *
   * Above the minimum but below this, the picture is usable and is accepted;
   * it is only the largest place it is shown that has to enlarge it. That is a
   * judgement for whoever chose the picture, so it produces a warning they can
   * read and upload past, not a refusal.
   */
  protected recommendedCroppedWidth = 0;

  /** The crop height the destination would rather have, when it has one. */
  protected recommendedCroppedHeight = 0;

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

  /**
   * Whether the current crop is usable but smaller than is wanted.
   *
   * @returns True when there is a crop, it clears the minimum, and it falls
   * short of the recommended size.
   */
  get isCroppedImageBelowRecommended(): boolean {
    if (!this.croppedImageWidth || !this.croppedImageHeight) return false;
    if (this.isCroppedImageBelowMinimum) return false;

    return (
      this.croppedImageWidth < this.recommendedCroppedWidth ||
      this.croppedImageHeight < this.recommendedCroppedHeight
    );
  }

  /**
   * What the creator is told about a crop that is smaller than is wanted.
   *
   * @returns The warning, or an empty string when the crop is big enough.
   */
  get croppedImageSizeWarning(): string {
    if (!this.isCroppedImageBelowRecommended) return '';

    return (
      `This selection is ${this.croppedImageWidth} by ` +
      `${this.croppedImageHeight} pixels, below the ` +
      `${this.recommendedCroppedWidth} by ${this.recommendedCroppedHeight} ` +
      `this is shown at, so it will look soft there. You can upload it as it ` +
      `is, but a larger picture will look better.`
    );
  }

  /**
   * Whether the current crop is too small for the destination to take.
   *
   * @returns True when there is a crop and it falls short of the minimum.
   */
  protected get isCroppedImageBelowMinimum(): boolean {
    if (!this.croppedImageWidth || !this.croppedImageHeight) return false;

    return (
      this.croppedImageWidth < this.minimumCroppedWidth ||
      this.croppedImageHeight < this.minimumCroppedHeight
    );
  }

  onImageCropped(event: ImageCroppedEvent): void {
    if (!event.blob) {
      console.error('Cropped image is not defined correctly');
      return;
    }

    this.croppedImageBlob = event.blob;
    this.croppedImageWidth = event.width;
    this.croppedImageHeight = event.height;

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

    const expectedType = `image/${this.outputFormat}`;
    const formatName = this.outputFormat.toUpperCase();

    if (this.croppedImageBlob.type !== expectedType) {
      console.error(`Cropped image is not in ${formatName} format`);
      this.displayErrorMessage(
        `The cropped image must be in ${formatName} format.`,
      );
      return false;
    }

    if (this.croppedImageBlob.size === 0) {
      console.error('Blob is empty');
      this.displayErrorMessage('Failed to upload image.');
      return false;
    }

    return this.validateCroppedSize();
  }

  /**
   * Checks the crop is large enough for where it is going.
   *
   * @returns True when there is no minimum, or the crop reaches it.
   */
  protected validateCroppedSize(): boolean {
    if (!this.isCroppedImageBelowMinimum) {
      return true;
    }

    console.error('Cropped image is smaller than the destination needs');
    this.displayErrorMessage(
      `That selection is ${this.croppedImageWidth} by ${this.croppedImageHeight} pixels. ` +
        `Please choose a larger picture, or select a bigger area: at least ` +
        `${this.minimumCroppedWidth} by ${this.minimumCroppedHeight} is needed.`,
    );
    return false;
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
    this.croppedImageWidth = 0;
    this.croppedImageHeight = 0;
    this.imageChangedEvent = null;
  }
}
