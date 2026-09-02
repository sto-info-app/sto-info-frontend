import { CommonModule } from '@angular/common';
import {
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
import {
  ControlContainer,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import {
  STORYTIME_IMAGE_ALT_MAX_LENGTH,
  STORYTIME_IMAGE_SPECS,
  StorytimeImageSlot,
  describeImageRequirement,
} from '../../storytime-image.constants';
import { StorytimeImageService } from '../../storytime-image.service';
import {
  StorytimeImageCropData,
  StorytimeImageCropDialogComponent,
} from '../image-crop-dialog/image-crop-dialog.component';

/**
 * One piece of a work's artwork, as its creator manages it.
 *
 * The picture is set and removed here and now, against the saved work, rather
 * than being staged into the form around it. An upload is not a field: it
 * either reached the server or it did not, and pretending otherwise would let
 * somebody crop an image, navigate away, and lose it.
 *
 * The description is the exception, and stays on the editor's own form. It is
 * captured with the upload — the one moment the author is certainly looking at
 * the picture — but a wording that reads badly afterwards is worth correcting
 * without asking for the picture again.
 */
@Component({
  selector: 'app-storytime-image-manager',
  templateUrl: './image-manager.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LcarsErrorMessageComponent],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
})
export class ImageManagerComponent {
  /** Which piece of artwork this manages. */
  @Input({ required: true }) slot!: StorytimeImageSlot;

  /** The saved work the artwork belongs to. */
  @Input({ required: true }) targetId!: string;

  /** The picture as it stands, or null when the slot is empty. */
  @Input() imageUrl: string | null = null;

  /** What that picture shows, so a replacement starts from it. */
  @Input() imageAlt: string | null = null;

  /** The control on the editor's form holding the description. */
  @Input({ required: true }) altControlName!: string;

  /**
   * Announces the work as the server now holds it.
   *
   * Handed out whole rather than as a URL, so the editor can refresh whatever
   * else changed — the version it must send with its next save included.
   */
  @Output() readonly changed = new EventEmitter<unknown>();

  /** A message to show when setting or removing the artwork failed. */
  errorMessage = '';

  /** Whether a removal is in flight. */
  isRemoving = false;

  /** The longest description the server accepts. */
  readonly altMaxLength = STORYTIME_IMAGE_ALT_MAX_LENGTH;

  private readonly _dialog = inject(MatDialog);
  private readonly _imageService = inject(StorytimeImageService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The rules this slot is held to.
   *
   * @returns The slot's label, guidance, shape and minimum size.
   */
  get spec() {
    return STORYTIME_IMAGE_SPECS[this.slot];
  }

  /**
   * The shape and size requirement, as the creator is told it.
   *
   * @returns A sentence naming the shape and the smallest usable picture.
   */
  get requirement(): string {
    return describeImageRequirement(this.slot);
  }

  /**
   * Whether there is a picture to show, replace and remove.
   *
   * @returns True when the slot is filled.
   */
  get hasImage(): boolean {
    return Boolean(this.imageUrl);
  }

  /**
   * Opens the crop dialog, and keeps whatever comes back from it.
   */
  onChooseClick(): void {
    const data: StorytimeImageCropData = {
      slot: this.slot,
      targetId: this.targetId,
      currentAlt: this.imageAlt,
    };

    this._dialog
      .open(StorytimeImageCropDialogComponent, {
        hasBackdrop: true,
        // Closed deliberately rather than by a stray click on the backdrop: a
        // crop somebody has just spent a minute on should not vanish because
        // they missed the dialog.
        disableClose: true,
        data,
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        // The dialog closes on the back of its upload's response, and this app
        // loads scripts that patch XMLHttpRequest out of zone.js's sight. The
        // result therefore arrives outside the Angular zone: the editor around
        // this would take the new picture and never render it, leaving the Add
        // button on screen until the page was reloaded.
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(updated => {
        // Undefined when the dialog was cancelled, which is not a failure and
        // leaves the slot exactly as it was.
        if (updated) {
          this.errorMessage = '';
          this.changed.emit(updated);
        }
      });
  }

  /**
   * Removes the picture, after asking.
   *
   * Confirmed because there is no undo: the image is deleted from storage, and
   * putting it back means finding the original again.
   */
  onRemoveClick(): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Remove the ${this.spec.label.toLowerCase()}?`,
          message:
            'The picture will be deleted. Putting it back means uploading it again.',
          confirmText: 'Remove',
          cancelText: 'Keep it',
        },
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(confirmed => {
        if (confirmed) {
          this.remove();
        }
      });
  }

  /**
   * Asks the server to empty the slot.
   */
  private remove(): void {
    this.isRemoving = true;
    this.errorMessage = '';

    this._imageService
      .remove(this.slot, this.targetId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: updated => {
          this.isRemoving = false;
          this.changed.emit(updated);
        },
        error: (error: { error?: { message?: string } }) => {
          this.isRemoving = false;
          this.errorMessage =
            error.error?.message ??
            'That picture could not be removed. Please try again shortly.';
        },
      });
  }
}
