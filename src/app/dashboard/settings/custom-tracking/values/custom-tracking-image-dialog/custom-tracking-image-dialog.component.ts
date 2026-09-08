import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';

import {
  CustomTrackingImageAnswer,
  CustomTrackingImageShapeSpec,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { CustomTrackingService } from '../../custom-tracking.service';

/** What the dialog needs to know about the picture it is setting. */
export interface CustomTrackingImageDialogData {
  /** The image field being answered. */
  fieldId: string;
  /** What the field is called. */
  fieldName: string;
  /** Whether an account or a character is being described. */
  scope: CustomTrackingTargetScope;
  /** The record being described. */
  targetId: string;
  /** The shape this field's pictures are cropped to, as the server states it. */
  spec: CustomTrackingImageShapeSpec;
  /** The description already on the picture, when one is being replaced. */
  currentAlt: string | null;
  /** The longest description the server accepts, as served. */
  altMaxLength: number;
}

/**
 * Choosing, cropping and describing the picture answering one image field.
 *
 * The crop is locked to the shape the field was configured with rather than
 * left free, because the picture is delivered through one fixed Cloudflare
 * variant: a free crop would be cut or letterboxed on the way to a reader, and
 * whoever framed it would never see which.
 *
 * The shape, the minimum size and the encoding all come from the server rather
 * than from constants here. A cropper enforcing a rule the server does not
 * hold the picture to refuses an upload only after somebody has already chosen
 * and framed it.
 *
 * The description is asked for here rather than on the editor behind. This is
 * the one moment somebody is certainly looking at the picture, and an image
 * nobody has described is simply absent to a reader using a screen reader.
 */
@Component({
  selector: 'app-custom-tracking-image-dialog',
  templateUrl: './custom-tracking-image-dialog.component.html',
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
export class CustomTrackingImageDialogComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<CustomTrackingImageDialogComponent>,
  );

  /** The field being answered, and what is already there. */
  readonly data = inject(MAT_DIALOG_DATA) as CustomTrackingImageDialogData;

  /** The shape and size this field's pictures are held to. */
  readonly spec = this.data.spec;

  /** The ratio the crop is locked to, as the cropper wants it. */
  readonly aspectRatio = this.spec.aspectWidth / this.spec.aspectHeight;

  /** What the picture shows, which travels with the upload. */
  altText = this.data.currentAlt ?? '';

  /** The longest description the server accepts. */
  readonly altMaxLength = this.data.altMaxLength;

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Creates the dialog, taking its crop rules from the served shape.
   */
  constructor() {
    super();

    this.outputFormat = this.spec.outputFormat;
    this.minimumCroppedWidth = this.spec.minimumWidth;
    this.minimumCroppedHeight = this.spec.minimumHeight;
    // The size a custom picture is delivered at is the size it must reach:
    // one variant, so anything smaller would be enlarged everywhere it is
    // shown rather than only in the largest rendering.
    this.recommendedCroppedWidth = this.spec.minimumWidth;
    this.recommendedCroppedHeight = this.spec.minimumHeight;
  }

  /** @returns The shape and size requirement, as the user is told it. */
  get requirement(): string {
    return (
      `${this.spec.aspectWidth}:${this.spec.aspectHeight}, at least ` +
      `${this.spec.minimumWidth} by ${this.spec.minimumHeight} pixels.`
    );
  }

  /** @returns What to call the part carrying the picture. */
  get fileName(): string {
    return `custom-tracking-${this.spec.shape.toLowerCase()}.${this.spec.outputFormat}`;
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
   * Sends the crop and its description, closing with the stored picture.
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

    this._customTracking
      .uploadImage(
        this.data.fieldId,
        this.data.scope,
        this.data.targetId,
        this.croppedImageBlob as Blob,
        description,
        this.fileName,
      )
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: (stored: CustomTrackingImageAnswer) => {
          this.isSubmitting = false;
          // Closed with what the server stored rather than with `true`, so the
          // editor behind shows the picture that actually landed instead of
          // guessing at the address Cloudflare will serve it from.
          this._dialogRef.close(stored);
        },
        error: (error: { status: number; error?: { message?: string } }) => {
          this.isSubmitting = false;

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
