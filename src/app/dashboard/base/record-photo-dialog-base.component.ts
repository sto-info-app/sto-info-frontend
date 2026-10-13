import { ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

/** The classes that lay a record photo dialogue out, in its own stylesheet. */
export interface RecordPhotoLayout {
  /** The row holding the cropper and, once a picture is chosen, the preview. */
  readonly row: string;
  /** The cropper's column. */
  readonly main: string;
  /** The preview's column. */
  readonly side: string;
}

/**
 * Setting the photo on a personnel record: the member's own profile, or one
 * of their Characters (FC-012).
 *
 * Both dialogues share one template and differ only in the record, its
 * wording and their own stylesheets, so the template and the upload are
 * written once here. The photo is cropped square and sent as a PNG.
 */
export abstract class RecordPhotoDialogBaseComponent extends ImageCropperBaseComponent {
  /** The heading over the dialogue. */
  abstract readonly heading: string;

  /** What to say when there is no record to set the photo on. */
  abstract readonly unavailableMessage: string;

  /** The classes that lay the dialogue out. */
  abstract readonly layout: RecordPhotoLayout;

  /** Whether the buttons sit in the Material dialogue's action row. */
  readonly inActionRow: boolean = false;

  /** What the uploaded file is called. */
  protected abstract readonly _fileName: string;

  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether there is a record to set the photo on.
   *
   * @returns True once the record is known.
   */
  abstract get hasRecord(): boolean;

  /**
   * Sends the crop to be scanned, and reports where the scan has got to
   * until the photo is in use or was refused.
   */
  onUploadImageClick(): void {
    try {
      if (!this.validateCroppedImage()) return;

      const formData = new FormData();
      formData.append('profilePicture', this.croppedImageBlob!, this._fileName);

      this.isSubmitting = true;
      this.send(formData)
        .pipe(observeInZone(this._ngZone, this._cdr))
        .subscribe({
          // The photo is not on the record yet: it is held privately and
          // scanned first, and this dialogue says where it has got to until
          // it is in use or was refused — FC-012.
          next: accepted => this.watchUpload(accepted),
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
   * Sends the photo to the record.
   *
   * @param formData - The photo, as the upload endpoint expects it.
   * @returns What the upload endpoint answered.
   */
  protected abstract send(formData: FormData): Observable<AcceptedAsset>;
}
