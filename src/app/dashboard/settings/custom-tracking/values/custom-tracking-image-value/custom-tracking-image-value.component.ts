import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingField,
  CustomTrackingImageAnswer,
  CustomTrackingImageShape,
  CustomTrackingImageShapeSpec,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { CustomTrackingService } from '../../custom-tracking.service';
import { escapeForMarkup } from '../../definitions/custom-tracking-deletion-message.utility';
import {
  CustomTrackingImageDialogComponent,
  CustomTrackingImageDialogData,
} from '../custom-tracking-image-dialog/custom-tracking-image-dialog.component';

/**
 * The picture answering one image field, for one account or character.
 *
 * A picture is set and removed on its own rather than with the rest of the
 * record. It arrives as bytes and is checked as bytes before anything is
 * stored, so it lands the moment it is uploaded — which is why this reports
 * what the server stored rather than waiting for the record to be saved.
 */
@Component({
  selector: 'app-custom-tracking-image-value',
  templateUrl: './custom-tracking-image-value.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTrackingImageValueComponent {
  /** The image field being answered. */
  @Input({ required: true }) field!: CustomTrackingField;

  /** Everything the server published about the feature. */
  @Input({ required: true }) configuration!: CustomTrackingConfiguration;

  /** Whether an account or a character is being described. */
  @Input({ required: true }) scope!: CustomTrackingTargetScope;

  /** The record being described. */
  @Input({ required: true }) targetId!: string;

  /** The picture there now, or null. */
  @Input() image: CustomTrackingImageAnswer | null = null;

  /** Reports the picture as the server now holds it, or its removal. */
  @Output() readonly changed =
    new EventEmitter<CustomTrackingImageAnswer | null>();

  /** What to tell the user when something failed. */
  errorMessage = '';

  private readonly _dialog = inject(MatDialog);
  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  /** @returns Whether pictures are switched on at all. */
  get isAvailable(): boolean {
    return this.configuration.features.imagesEnabled;
  }

  /**
   * The shape this field's pictures are cropped to.
   *
   * @returns The served description of the shape, or null where the field
   *   somehow names one the server does not publish.
   */
  get spec(): CustomTrackingImageShapeSpec | null {
    const configured = this.field.configuration['shape'];

    return (
      this.configuration.imageShapes.find(
        shape => shape.shape === (configured as CustomTrackingImageShape),
      ) ?? null
    );
  }

  /**
   * Where the stored picture is fetched from.
   *
   * Built from the variant the server publishes for the shape rather than one
   * written down here, so a renamed variant cannot leave a broken picture that
   * reports no error at all.
   *
   * @returns The address, or an empty string where there is no picture.
   */
  get imageUrl(): string {
    const spec = this.spec;

    return this.image && spec
      ? `${BASE_CLOUDFLARE_IMAGES_URL}/${this.image.imageId}/${spec.variant}`
      : '';
  }

  /** Opens the cropper to add or replace the picture. */
  choose(): void {
    const spec = this.spec;

    if (!spec) {
      return;
    }

    const data: CustomTrackingImageDialogData = {
      fieldId: this.field.id,
      fieldName: this.field.name,
      scope: this.scope,
      targetId: this.targetId,
      spec,
      currentAlt: this.image?.altText ?? null,
      altMaxLength: this.configuration.limits.MAX_IMAGE_ALT_LENGTH,
    };

    this._dialog
      .open(CustomTrackingImageDialogComponent, { data })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe((stored: CustomTrackingImageAnswer | undefined) => {
        if (stored) {
          this.image = stored;
          this.changed.emit(stored);
        }
      });
  }

  /** Removes the picture, once the user has confirmed it. */
  remove(): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Remove picture',
          message: `<p>Remove the picture answering
            <strong>${escapeForMarkup(this.field.name)}</strong>?</p>
            <p>The picture goes at once. Nothing else about this record
            changes, and you can upload another whenever you like.</p>`,
          confirmText: 'Remove',
          cancelText: 'Cancel',
        },
      })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.send();
        }
      });
  }

  /** Tells the server to forget the picture. */
  private send(): void {
    this.errorMessage = '';

    this._customTracking
      .removeImage(this.field.id, this.scope, this.targetId)
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.image = null;
          this.changed.emit(null);
        },
        error: () => {
          this.errorMessage = 'That picture could not be removed. Try again.';
        },
      });
  }
}
