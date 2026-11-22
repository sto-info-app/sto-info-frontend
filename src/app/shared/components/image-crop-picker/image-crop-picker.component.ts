import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

/**
 * Choosing a picture for an artwork slot, then cropping it to the slot's
 * shape (FC-012).
 *
 * The file input and, once a picture is chosen, the cropper locked to the
 * slot's aspect ratio. What is done with the choice and the crop is the
 * dialogue's own: the picker only passes them on. Its host takes no box of
 * its own, so the dialogue's layout reaches the input and the cropper as it
 * always did.
 */
@Component({
  selector: 'app-image-crop-picker',
  templateUrl: './image-crop-picker.component.html',
  styleUrls: ['./image-crop-picker.component.scss'],
  standalone: true,
  imports: [ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCropPickerComponent {
  /** What the slot is called, such as “Banner”, for the input's label. */
  readonly label = input.required<string>();

  /** The choice of picture, once one is made, which the cropper reads. */
  readonly imageChangedEvent = input.required<Event | null>();

  /** The width the crop is locked to, over its height. */
  readonly aspectRatio = input.required<number>();

  /** How the crop is encoded. */
  readonly format = input.required<'png' | 'jpeg'>();

  /** Whether choosing is closed, while an upload is under way. */
  readonly disabled = input(false);

  /** A picture was chosen. */
  readonly fileChange = output<Event>();

  /** The crop changed. */
  readonly imageCropped = output<ImageCroppedEvent>();

  /** The chosen picture could not be read. */
  readonly loadImageFailed = output<void>();
}
