import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DescribedImageCropperBaseComponent } from 'src/app/shared/base/described-image-cropper-base.component';
import { ImageCropPickerComponent } from 'src/app/shared/components/image-crop-picker/image-crop-picker.component';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
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
 * Size is treated differently from shape. A crop below the slot's recommended
 * size is warned about rather than refused: only the largest rendering has to
 * enlarge it, and whoever is looking at the picture is better placed than the
 * dialog to decide whether that matters. Below the slot's minimum, where even
 * the compact rendering would be upscaled, it is still refused.
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
    ImageCropPickerComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    AssetScanStatusComponent,
    LcarsWarningMessageComponent,
  ],
})
export class StorytimeImageCropDialogComponent extends DescribedImageCropperBaseComponent {
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

  private readonly _imageService = inject(StorytimeImageService);

  /**
   * Creates the dialog, taking its crop rules from the slot being filled.
   */
  constructor() {
    super();

    this.altText = this.data.currentAlt ?? '';
    this.holdCropTo(this.spec);
  }

  /**
   * Fetches the work and closes with it, now that the picture is in use.
   *
   * The editor behind expects the work rather than a signal, so that it can
   * show the picture the server actually stored instead of guessing at the
   * address Cloudflare will serve it from. That address only came into
   * existence when the scan cleared, so it is fetched here rather than
   * taken from the upload's response.
   */
  protected override closeWithPublished(): void {
    this._imageService
      .reload(this.data.slot, this.data.targetId)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: updated => this._dialogRef.close(updated),
        // The picture is published either way, so the editor is told to
        // reload rather than told the upload failed.
        error: () => this._dialogRef.close(true),
      });
  }

  /**
   * Sends the crop and its description to be scanned.
   */
  onUploadImageClick(): void {
    this.uploadDescribed(
      'Please describe what the image shows.',
      (image, description) =>
        this._imageService.upload(
          this.data.slot,
          this.data.targetId,
          image,
          description,
        ),
    );
  }
}
