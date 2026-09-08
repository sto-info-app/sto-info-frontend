import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import {
  CustomTrackingImageShape,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';

import { CustomTrackingService } from '../../custom-tracking.service';
import { aConfiguration } from 'src/app/shared/custom-tracking/custom-tracking.testing';
import {
  CustomTrackingImageDialogComponent,
  CustomTrackingImageDialogData,
} from './custom-tracking-image-dialog.component';

describe('CustomTrackingImageDialogComponent', () => {
  const spec = aConfiguration().imageShapes[0];
  const stored = {
    imageId: 'image-1',
    altText: 'A ship',
    shape: CustomTrackingImageShape.SQUARE,
  };

  let fixture: ComponentFixture<CustomTrackingImageDialogComponent>;
  let component: CustomTrackingImageDialogComponent;
  let dialogRef: { close: jest.Mock };
  let uploadImage: jest.Mock;

  const render = (currentAlt: string | null = null): HTMLElement => {
    const data: CustomTrackingImageDialogData = {
      fieldId: 'field-1',
      fieldName: 'Ship picture',
      scope: CustomTrackingTargetScope.ACCOUNT,
      targetId: 'target-1',
      spec,
      currentAlt,
      altMaxLength: 200,
    };

    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });

    fixture = TestBed.createComponent(CustomTrackingImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const withCrop = (
    width: number,
    height: number,
    type = 'image/png',
  ): void => {
    component.croppedImageBlob = new Blob(['data'], { type });
    component.croppedImage = 'data:image/png;base64,abc';
    component.croppedImageWidth = width;
    component.croppedImageHeight = height;
  };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    uploadImage = jest.fn().mockReturnValue(of(stored));

    TestBed.configureTestingModule({
      imports: [CustomTrackingImageDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: CustomTrackingService, useValue: { uploadImage } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The shape, the size and the encoding all come from the server. A cropper
  // enforcing a rule the server does not hold the picture to refuses an upload
  // only after somebody has already chosen and framed it.
  it('locks the crop to the shape the server published', () => {
    const element = render();

    expect(component.aspectRatio).toBe(1);
    expect(component.requirement).toBe('1:1, at least 300 by 300 pixels.');
    expect(element.textContent).toContain('Ship picture');
    expect(element.textContent).toContain('at least 300 by 300 pixels');
  });

  it('names the part it sends after the shape and its encoding', () => {
    render();

    expect(component.fileName).toBe('custom-tracking-square.png');
  });

  it('starts from the description already on the picture', () => {
    render('A ship at speed');

    expect(component.altText).toBe('A ship at speed');
  });

  // An image nobody has described is simply absent to a reader using a screen
  // reader, so the description is part of the upload rather than an afterthought.
  it('will not upload without a crop and a description', () => {
    render();

    expect(component.canUpload).toBe(false);

    withCrop(300, 300);
    expect(component.canUpload).toBe(false);

    component.altText = 'A ship';
    expect(component.canUpload).toBe(true);
  });

  it('sends the crop, its description and where it belongs', () => {
    render();
    withCrop(300, 300);
    component.altText = '  A ship  ';
    component.onUploadImageClick();

    expect(uploadImage).toHaveBeenCalledWith(
      'field-1',
      CustomTrackingTargetScope.ACCOUNT,
      'target-1',
      component.croppedImageBlob,
      'A ship',
      'custom-tracking-square.png',
    );
  });

  // Closed with what the server stored rather than with `true`, so the editor
  // behind shows the picture that actually landed.
  it('closes with the picture the server stored', () => {
    render();
    withCrop(300, 300);
    component.altText = 'A ship';
    component.onUploadImageClick();

    expect(dialogRef.close).toHaveBeenCalledWith(stored);
  });

  it('refuses a crop smaller than the picture is delivered at', () => {
    render();
    withCrop(200, 200);
    component.altText = 'A ship';
    component.onUploadImageClick();

    expect(uploadImage).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('at least 300 by 300');
  });

  it('refuses an upload with nothing to describe', () => {
    render();
    withCrop(300, 300);
    component.altText = '   ';
    component.onUploadImageClick();

    expect(uploadImage).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('describe what the image shows');
  });

  // The server names the specific problem, which is more use than a generic
  // apology when it can.
  it('repeats what the server said was wrong', () => {
    uploadImage.mockReturnValue(
      throwError(() => ({ status: 400, error: { message: 'Too large.' } })),
    );
    render();
    withCrop(300, 300);
    component.altText = 'A ship';
    component.onUploadImageClick();

    expect(component.errorMessage).toBe('Too large.');
    expect(component.isSubmitting).toBe(false);
  });

  it('falls back to our own wording where the server explains nothing', () => {
    uploadImage.mockReturnValue(throwError(() => ({ status: 0 })));
    render();
    withCrop(300, 300);
    component.altText = 'A ship';
    component.onUploadImageClick();

    expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
  });

  it('closes without uploading when cancelled', () => {
    render();
    component.onCloseClick();

    expect(dialogRef.close).toHaveBeenCalledWith();
    expect(uploadImage).not.toHaveBeenCalled();
  });
});
