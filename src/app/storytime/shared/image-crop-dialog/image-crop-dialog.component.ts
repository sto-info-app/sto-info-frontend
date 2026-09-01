import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  STORYTIME_IMAGE_ALT_MAX_LENGTH,
  STORYTIME_IMAGE_SPECS,
  StorytimeImageSlot,
  describeImageRequirement,
} from '../../storytime-image.constants';
import { StorytimeImageService } from '../../storytime-image.service';

/** What the dialog needs to know about the slot it is filling. */
export interface StorytimeImageCropData {
  /** Which piece of artwork is being set. */
  slot: StorytimeImageSlot;
  /** The work the artwork belongs to. */
  targetId: string;
  /** The description already on the slot, when one is being replaced. */
  currentAlt: string | null;
}

/**
 * Choosing, cropping and describing one piece of Storytime artwork.
 *
 * The crop is locked to the slot's shape rather than left free, because every
 * one of these is delivered through fixed Cloudflare variants: a free crop
 * would be letterboxed or cut on the way to the reader, and the creator would
 * never see which.
 *
 * The description is asked for here rather than on the editor behind it. This
 * is the one moment somebody is certainly looking at the picture, and an image
 * nobody has described is simply absent to a reader using a screen reader.
 */
@Component({
  selector: 'app-storytime-image-crop-dialog',
  templateUrl: './image-crop-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageCropperComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class StorytimeImageCropDialogComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<StorytimeImageCropDialogComponent>,
  );

  /** The slot being filled, and what is already in it. */
  readonly data = inject(MAT_DIALOG_DATA) as StorytimeImageCropData;

  /** The rules this slot is held to. */
  readonly spec = STORYTIME_IMAGE_SPECS[this.data.slot];

  /** The shape and size requirement, as the creator is told it. */
  readonly requirement = describeImageRequirement(this.data.slot);

  /** The longest description the server accepts. */
  readonly altMaxLength = STORYTIME_IMAGE_ALT_MAX_LENGTH;

  /** What the picture shows, which travels with the upload. */
  altText = this.data.currentAlt ?? '';

  private readonly _imageService = inject(StorytimeImageService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Creates the dialog, taking its crop rules from the slot being filled.
   */
  constructor() {
    super();

    this.outputFormat = this.spec.outputFormat;
    this.minimumCroppedWidth = this.spec.minimumWidth;
    this.minimumCroppedHeight = this.spec.minimumHeight;
  }

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
   * Sends the crop and its description, closing with the updated work.
   */
  onUploadImageClick(): void {
    if (!this.validateCroppedImage()) {
      return;
    }

    const description = this.altText.trim();

    if (!description) {
      this.displayErrorMessage('Please describe what the image shows.');
      return;
    }

    this.isSubmitting = true;

    this._imageService
      .upload(
        this.data.slot,
        this.data.targetId,
        this.croppedImageBlob!,
        description,
      )
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: updated => {
          this.isSubmitting = false;
          // Closed with the work rather than with `true`, so the editor behind
          // shows the picture the server actually stored instead of guessing
          // at the address Cloudflare will serve it from.
          this._dialogRef.close(updated);
        },
        error: (error: { status: number; error?: { message?: string } }) => {
          this.isSubmitting = false;
          // The server names the specific problem — a crop below the size the
          // slot needs, or an image larger than the limit — which is more use
          // than a generic failure.
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
