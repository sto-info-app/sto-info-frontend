import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';
import { StorytimeImageSlot } from '../../storytime-image.constants';
import { StorytimeImageService } from '../../storytime-image.service';
import {
  StorytimeImageCropData,
  StorytimeImageCropDialogComponent,
} from './image-crop-dialog.component';

describe('StorytimeImageCropDialogComponent', () => {
  let fixture: ComponentFixture<StorytimeImageCropDialogComponent>;
  let component: StorytimeImageCropDialogComponent;
  let dialogRef: { close: jest.Mock };
  let imageService: { upload: jest.Mock; remove: jest.Mock };

  const updatedWork = { id: 'work-1' };

  /**
   * Builds the dialog for a slot.
   *
   * @param slot - Which piece of artwork is being set.
   * @param currentAlt - The description already on the slot, if any.
   * @returns The rendered element.
   */
  const render = (
    slot: StorytimeImageSlot = StorytimeImageSlot.STORY_BANNER,
    currentAlt: string | null = null,
  ): HTMLElement => {
    const data: StorytimeImageCropData = {
      slot,
      targetId: 'work-1',
      currentAlt,
    };

    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });

    fixture = TestBed.createComponent(StorytimeImageCropDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Puts a valid crop of the given size on the component.
   *
   * @param width - The crop's width.
   * @param height - The crop's height.
   * @param type - The encoding the cropper produced.
   */
  const withCrop = (
    width: number,
    height: number,
    type = 'image/jpeg',
  ): void => {
    component.croppedImageBlob = new Blob(['data'], { type });
    component.croppedImage = 'data:image/jpeg;base64,abc';
    component.croppedImageWidth = width;
    component.croppedImageHeight = height;
  };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    imageService = {
      upload: jest.fn().mockReturnValue(of(updatedWork)),
      remove: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [StorytimeImageCropDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: StorytimeImageService, useValue: imageService },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is created', () => {
    render();
    expect(component).toBeTruthy();
  });

  // The crop rules come from the slot rather than from the dialog, so the size
  // a creator is asked for and the size the server insists on are one
  // statement rather than two that agree today.
  it('takes its shape, size and encoding from the slot', () => {
    const element = render(StorytimeImageSlot.CHARACTER_PORTRAIT);

    expect(component.spec.aspectRatio).toBeCloseTo(2 / 3);
    expect(component.spec.outputFormat).toBe('png');
    expect(element.textContent).toContain('at least 400 by 600 pixels');
  });

  it('starts from the description already on the slot', () => {
    render(StorytimeImageSlot.STORY_BANNER, 'The USS Ares at warp');

    expect(component.altText).toBe('The USS Ares at warp');
  });

  describe('whether it can upload yet', () => {
    it('cannot without a crop', () => {
      render();
      component.altText = 'A ship';

      expect(component.canUpload).toBe(false);
    });

    // An image nobody has described is simply absent to a reader using a
    // screen reader, so the description is not optional.
    it('cannot without a description', () => {
      render();
      withCrop(2400, 480);
      component.altText = '   ';

      expect(component.canUpload).toBe(false);
    });

    it('cannot while one is already in flight', () => {
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';
      component.isSubmitting = true;

      expect(component.canUpload).toBe(false);
    });

    it('can with both', () => {
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';

      expect(component.canUpload).toBe(true);
    });
  });

  describe('uploading', () => {
    it('sends the crop and its description, and closes with the work', () => {
      render();
      withCrop(2400, 480);
      component.altText = '  The USS Ares at warp  ';

      component.onUploadImageClick();

      expect(imageService.upload).toHaveBeenCalledWith(
        StorytimeImageSlot.STORY_BANNER,
        'work-1',
        component.croppedImageBlob,
        'The USS Ares at warp',
      );
      // Closed with the work rather than with `true`, so the editor behind
      // shows the picture the server actually stored.
      expect(dialogRef.close).toHaveBeenCalledWith(updatedWork);
    });

    it('refuses a crop smaller than the slot delivers', () => {
      render();
      withCrop(1200, 240);
      component.altText = 'A ship';

      component.onUploadImageClick();

      expect(imageService.upload).not.toHaveBeenCalled();
      expect(component.errorMessage).toContain('2400 by 480');
    });

    // The button is disabled without one, but a description of only spaces
    // would otherwise reach the server and be turned away there.
    it('refuses a description of nothing but spaces', () => {
      render();
      withCrop(2400, 480);
      component.altText = '   ';

      component.onUploadImageClick();

      expect(imageService.upload).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe(
        'Please describe what the image shows.',
      );
    });

    it('repeats what the server said when it refused', () => {
      imageService.upload.mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'That image is 12.0 MB.' },
        })),
      );
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';

      component.onUploadImageClick();

      expect(component.errorMessage).toBe('That image is 12.0 MB.');
      expect(component.isSubmitting).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('falls back to the general message when the server explained nothing', () => {
      imageService.upload.mockReturnValue(throwError(() => ({ status: 0 })));
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';

      component.onUploadImageClick();

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    });
  });
});
