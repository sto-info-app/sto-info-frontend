import { ChangeDetectorRef, Component, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { ImageCropperComponent } from 'ngx-image-cropper';

import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import {
  describeFleetImageRequirement,
  FLEET_IMAGE_ALT_MAX_LENGTH,
  FLEET_IMAGE_SPECS,
  FleetImageSlot,
} from '../../fleet-image.constants';
import {
  FleetArtworkTarget,
  FleetImageService,
} from '../../fleet-image.service';

/** What the dialogue needs to know about the slot it is filling. */
export interface FleetImageCropData {
  /** Which picture is being set. */
  slot: FleetImageSlot;
  /** Whose artwork it is. */
  target: FleetArtworkTarget;
  /** The name of the record, for the heading. */
  scopeName: string;
  /** The description already on the slot, when one is being replaced. */
  currentAlt: string | null;
}

/**
 * Choosing, cropping and describing a Fleet scope's banner or emblem.
 *
 * One dialogue for both slots and all four kinds of record, as Storytime has
 * one for its seven. What differs between a banner and an emblem is the
 * shape, the two sizes and the encoding, and all three hang off the slot;
 * what differs between a Community and an unregistered Fleet is the address,
 * and that is the service's business. A second component would be the same
 * component with two constants changed, and a second place for the scan
 * reporting to drift.
 *
 * The crop is locked to the slot's shape rather than left free, because both
 * are delivered through fixed Cloudflare variants: a free crop would be
 * letterboxed or cut on the way to the reader, who would never see which.
 *
 * The description is asked for here rather than on the page behind. This is
 * the one moment somebody is certainly looking at the picture, and one
 * nobody has described is simply absent to a reader using a screen reader.
 */
@Component({
  selector: 'app-fleet-image-crop-dialog',
  templateUrl: './fleet-image-crop-dialog.component.html',
  standalone: true,
  imports: [
    FormsModule,
    ImageCropperComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    AssetScanStatusComponent,
    LcarsWarningMessageComponent,
  ],
})
export class FleetImageCropDialogComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<FleetImageCropDialogComponent>,
  );

  /** The slot being filled, and what is already in it. */
  readonly data = inject(MAT_DIALOG_DATA) as FleetImageCropData;

  /** The rules this slot is held to. */
  readonly spec = FLEET_IMAGE_SPECS[this.data.slot];

  /** The shape and size requirement, as somebody is told it. */
  readonly requirement = describeFleetImageRequirement(this.data.slot);

  /** The longest description the server accepts. */
  readonly altMaxLength = FLEET_IMAGE_ALT_MAX_LENGTH;

  /** What the picture shows, which travels with the upload. */
  altText = this.data.currentAlt ?? '';

  private readonly _imageService = inject(FleetImageService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Creates the dialogue, taking its crop rules from the slot being filled.
   */
  constructor() {
    super();

    this.outputFormat = this.spec.outputFormat;
    this.minimumCroppedWidth = this.spec.minimumWidth;
    this.minimumCroppedHeight = this.spec.minimumHeight;
    this.recommendedCroppedWidth = this.spec.recommendedWidth;
    this.recommendedCroppedHeight = this.spec.recommendedHeight;
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
   * Sends the crop and its description to be scanned.
   */
  onUploadImageClick(): void {
    if (!this.validateCroppedImage()) {
      return;
    }

    const description = this.altText.trim();

    if (!description) {
      this.displayErrorMessage('Please describe what the picture shows.');

      return;
    }

    this.isSubmitting = true;

    this._imageService
      .upload(
        this.data.target,
        this.data.slot,
        this.croppedImageBlob as Blob,
        description,
      )
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
