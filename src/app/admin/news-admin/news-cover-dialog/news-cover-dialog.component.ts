import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  NEWS_COVER_ALT_MAX_LENGTH,
  NEWS_COVER_REQUIREMENT,
  NEWS_COVER_SPEC,
} from 'src/app/news/news-cover.constants';
import { NewsService } from 'src/app/news/news.service';
import { DescribedImageCropperBaseComponent } from 'src/app/shared/base/described-image-cropper-base.component';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { ImageCropPickerComponent } from 'src/app/shared/components/image-crop-picker/image-crop-picker.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

/** What the dialogue needs to know about the post it is covering. */
export interface NewsCoverDialogData {
  /** The post. */
  postId: string;
  /** Its title, for the heading. */
  scopeName: string;
  /** The description already on the cover, when one is being replaced. */
  currentAlt: string | null;
}

/**
 * Choosing, cropping and describing a site news post's cover (sc-1447).
 *
 * The same dialogue as a Fleet news cover's, down to its template, which is
 * shared rather than copied: the crop, the description and the scan report
 * are identical, and only where the picture is sent differs. The crop is
 * locked to 16:9 because the cover is delivered through fixed Cloudflare
 * variants, and the description is required here, the one moment somebody is
 * certainly looking at the picture.
 */
@Component({
  selector: 'app-news-cover-dialog',
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
export class NewsCoverDialogComponent extends DescribedImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<NewsCoverDialogComponent>,
  );

  /** The post being covered, and what its cover already says. */
  readonly data = inject(MAT_DIALOG_DATA) as NewsCoverDialogData;

  /** The rules a cover is held to. */
  readonly spec = NEWS_COVER_SPEC;

  /** The shape and size requirement, as somebody is told it. */
  readonly requirement = NEWS_COVER_REQUIREMENT;

  /** The longest description the server accepts. */
  readonly altMaxLength = NEWS_COVER_ALT_MAX_LENGTH;

  private readonly _newsService = inject(NewsService);

  /**
   * Creates the dialogue, holding the crop to a cover's shape.
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
        this._newsService.uploadCover(this.data.postId, image, description),
    );
  }
}
