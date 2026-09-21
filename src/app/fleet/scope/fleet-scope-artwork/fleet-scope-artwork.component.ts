import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { take } from 'rxjs';

import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import { FleetImageService } from 'src/app/fleet/fleet-image.service';
import { FleetImageCropDialogComponent } from 'src/app/fleet/images/fleet-image-crop-dialog/fleet-image-crop-dialog.component';
import {
  FleetScopeArtworkSlotVm,
  FleetScopeArtworkVm,
} from 'src/app/fleet/scope/fleet-scope-page.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';

/** What a reader is told when a picture could not be taken down. */
export const ARTWORK_REMOVE_FAILED =
  'That picture could not be removed. Please try again.';

/**
 * The controls for a scope's banner and emblem, for somebody who may use
 * them.
 *
 * On the page rather than behind a settings screen, because the picture
 * being changed is the one on the page: a reader judging a new banner wants
 * to see it where it will sit, not in a form.
 *
 * Nothing is drawn for a slot the viewer may not change. A disabled button
 * would tell somebody about a permission they do not have and did not ask
 * about, and at an unregistered Fleet it would be telling them the picture
 * is somebody else's in the least useful possible way.
 *
 * Every change asks the page to read the record again rather than patching
 * what is on screen. A picture's delivery address only comes into existence
 * when its scan clears, so nothing here knows it; a removal is immediate,
 * but reading back is what makes the two paths one.
 */
@Component({
  selector: 'app-fleet-scope-artwork',
  templateUrl: './fleet-scope-artwork.component.html',
  styleUrls: ['./fleet-scope-artwork.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcarsErrorMessageComponent],
})
export class FleetScopeArtworkComponent {
  /** The record's artwork, and what may be done to it. */
  @Input({ required: true }) vm!: FleetScopeArtworkVm;

  /** Raised when the record should be read again. */
  @Output() readonly changed = new EventEmitter<void>();

  /** What went wrong taking a picture down, where anything did. */
  errorMessage = '';

  private readonly _dialog = inject(MatDialog);
  private readonly _images = inject(FleetImageService);
  private readonly _changeDetector = inject(ChangeDetectorRef);

  /**
   * The slots this viewer may actually do something with.
   *
   * @returns The offerable slots, in the order the record shows them.
   */
  get offered(): readonly FleetScopeArtworkSlotVm[] {
    return this.vm.slots.filter(slot => slot.mayManage);
  }

  /**
   * What the button for a slot should say.
   *
   * "Set" and "Replace" are different acts, and a reader about to paint over
   * a picture should be told that is what they are doing.
   *
   * @param slot - The slot.
   * @returns The button's label.
   */
  actionLabel(slot: FleetScopeArtworkSlotVm): string {
    return slot.picture === null
      ? `Set the ${slot.label.toLowerCase()}`
      : `Replace the ${slot.label.toLowerCase()}`;
  }

  /**
   * Opens the cropper for one slot.
   *
   * @param slot - The slot being filled.
   */
  onChangeClick(slot: FleetScopeArtworkSlotVm): void {
    this.errorMessage = '';

    this._dialog
      .open(FleetImageCropDialogComponent, {
        data: {
          slot: slot.slot,
          target: this.vm.target,
          scopeName: this.vm.scopeName,
          // The description already there is where a replacement starts:
          // most replacements show the same thing a little better, and
          // retyping it is how a picture ends up described as the last one.
          currentAlt: slot.picture?.alt ?? null,
        },
        // Wide, because a 5:1 banner cropped in a narrow dialogue is a strip
        // nobody can judge.
        width: '90vw',
        maxWidth: '1100px',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(published => {
        if (published) {
          this.changed.emit();
        }
      });
  }

  /**
   * Takes a picture down, once it has been confirmed.
   *
   * @param slot - The slot being emptied.
   */
  onRemoveClick(slot: FleetScopeArtworkSlotVm): void {
    this.errorMessage = '';

    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Remove the ${slot.label.toLowerCase()}?`,
          message:
            `The ${slot.label.toLowerCase()} will be taken down straight ` +
            'away and cannot be put back without uploading it again.',
          confirmText: 'Remove',
          cancelText: 'Keep it',
        },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(confirmed => {
        if (confirmed) {
          this.remove(slot);
        }
      });
  }

  /**
   * Asks the server to empty a slot.
   *
   * @param slot - The slot being emptied.
   */
  private remove(slot: FleetScopeArtworkSlotVm): void {
    this._images.remove(this.vm.target, slot.slot).subscribe({
      next: () => this.changed.emit(),
      error: (error: { error?: { message?: string } }) => {
        // The server names the specific problem — somebody else's picture,
        // a slot already empty — which is more use than a general failure.
        this.errorMessage = error.error?.message ?? ARTWORK_REMOVE_FAILED;
        this._changeDetector.markForCheck();
      },
    });
  }

  /**
   * Tracks a slot across renders.
   *
   * @param _index - The position, which is not what identifies it.
   * @param slot - The slot.
   * @returns Which picture it is.
   */
  trackSlot(_index: number, slot: FleetScopeArtworkSlotVm): FleetImageSlot {
    return slot.slot;
  }
}
