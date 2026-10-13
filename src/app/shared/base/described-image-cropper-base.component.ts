import { ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

/** The sizes and encoding a slot holds a cropped picture to. */
export interface ImageCropRules {
  /** The narrowest crop the slot accepts. */
  readonly minimumWidth: number;
  /** The shortest crop the slot accepts. */
  readonly minimumHeight: number;
  /** The width below which the crop is warned about. */
  readonly recommendedWidth: number;
  /** The height below which the crop is warned about. */
  readonly recommendedHeight: number;
  /** How the crop is encoded. */
  readonly outputFormat: 'png' | 'jpeg';
}

/**
 * A dialogue that crops a picture for one artwork slot and asks what it
 * shows, before sending both to be scanned (FC-012).
 *
 * Fleet artwork, Storytime artwork and Custom Tracking pictures are chosen
 * this way. The crop is locked to the slot's shape, and the description is
 * asked for here, the one moment somebody is certainly looking at the
 * picture; the upload is refused until there is both a crop and a
 * description.
 */
export abstract class DescribedImageCropperBaseComponent extends ImageCropperBaseComponent {
  /** What the picture shows, which travels with the upload. */
  altText = '';

  protected readonly _ngZone = inject(NgZone);
  protected readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether the upload button should do anything yet.
   *
   * @returns True when there is a crop and a description to send with it.
   */
  get canUpload(): boolean {
    return (
      this.croppedImage !== '' &&
      this.altText.trim().length > 0 &&
      !this.isSubmitting
    );
  }

  /**
   * Holds the crop to a slot's sizes and encoding.
   *
   * @param rules - The slot's rules.
   */
  protected holdCropTo(rules: ImageCropRules): void {
    this.outputFormat = rules.outputFormat;
    this.minimumCroppedWidth = rules.minimumWidth;
    this.minimumCroppedHeight = rules.minimumHeight;
    this.recommendedCroppedWidth = rules.recommendedWidth;
    this.recommendedCroppedHeight = rules.recommendedHeight;
  }

  /**
   * Sends the crop and its description, and reports where the scan has got
   * to until the picture is in use or was refused.
   *
   * @param missingDescription - What to say when nothing describes it.
   * @param upload - Sends the crop with its description.
   */
  protected uploadDescribed(
    missingDescription: string,
    upload: (image: Blob, description: string) => Observable<AcceptedAsset>,
  ): void {
    if (!this.validateCroppedImage()) {
      return;
    }

    const description = this.altText.trim();

    if (!description) {
      this.displayErrorMessage(missingDescription);

      return;
    }

    this.isSubmitting = true;

    upload(this.croppedImageBlob as Blob, description)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        // Nothing has changed yet. The picture is held privately and
        // scanned first, and this dialogue reports where it has got to
        // until it is in use or was refused — FC-012.
        next: accepted => this.watchUpload(accepted),
        error: (error: { status: number; error?: { message?: string } }) => {
          this.isSubmitting = false;
          // The server names the specific problem — a crop below the size
          // the slot needs, a picture over the limit, somebody else's work
          // in the slot — which is more use than a generic failure.
          const message = error.error?.message;

          if (message) {
            this.displayErrorMessage(message);

            return;
          }

          this.handleHttpError(error);
        },
      });
  }
}
