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
    ImageCropPickerComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    AssetScanStatusComponent,
    LcarsWarningMessageComponent,
  ],
})
export class FleetImageCropDialogComponent extends DescribedImageCropperBaseComponent {
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

  private readonly _imageService = inject(FleetImageService);

  /**
   * Creates the dialogue, taking its crop rules from the slot being filled.
   */
  constructor() {
    super();

    this.altText = this.data.currentAlt ?? '';
    this.holdCropTo(this.spec);
  }

  /**
   * Sends the crop and its description to be scanned.
   */
  onUploadImageClick(): void {
    this.uploadDescribed(
      'Please describe what the picture shows.',
      (image, description) =>
        this._imageService.upload(
          this.data.target,
          this.data.slot,
          image,
          description,
        ),
    );
  }
}
