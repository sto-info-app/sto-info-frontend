import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { DescribedImageCropperBaseComponent } from 'src/app/shared/base/described-image-cropper-base.component';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { ImageCropPickerComponent } from 'src/app/shared/components/image-crop-picker/image-crop-picker.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

import {
  LOG_PICTURE_ALT_MAX_LENGTH,
  LOG_PICTURE_REQUIREMENT,
  LOG_PICTURE_SPEC,
} from '../captains-log.constants';
import { CaptainsLogService } from '../captains-log.service';

/** What the dialogue needs to know about the entry it is picturing. */
export interface LogPictureDialogData {
  /** The entry. */
  entryId: string;
  /** Its headline, for the heading. */
  scopeName: string;
  /** The description already on the picture, when one is being replaced. */
  currentAlt: string | null;
}

/**
 * Choosing, cropping and describing a Log entry's picture (sc-1450).
 *
 * The same dialogue as a news cover's, down to its template: the crop, the
 * description and the scan report are identical, and only where the picture
 * is sent differs. The description is required, as every picture's is.
 */
@Component({
  selector: 'app-log-picture-dialog',
  templateUrl:
    '../../../fleet/images/fleet-image-crop-dialog/fleet-image-crop-dialog.component.html',
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
export class LogPictureDialogComponent extends DescribedImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<LogPictureDialogComponent>,
  );

  /** The entry being pictured, and what its picture already says. */
  readonly data = inject(MAT_DIALOG_DATA) as LogPictureDialogData;

  /** The rules a picture is held to. */
  readonly spec = LOG_PICTURE_SPEC;

  /** The shape and size requirement, as somebody is told it. */
  readonly requirement = LOG_PICTURE_REQUIREMENT;

  /** The longest description the server accepts. */
  readonly altMaxLength = LOG_PICTURE_ALT_MAX_LENGTH;

  private readonly _log = inject(CaptainsLogService);

  /**
   * Creates the dialogue, holding the crop to a picture's shape.
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
        this._log.uploadPicture(this.data.entryId, image, description),
    );
  }
}
