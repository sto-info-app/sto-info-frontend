import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of } from 'rxjs';

import { AssetScanService } from 'src/app/shared/services/asset-scan.service';

import { CaptainsLogService } from '../captains-log.service';
import {
  LogPictureDialogComponent,
  LogPictureDialogData,
} from './log-picture-dialog.component';

describe('LogPictureDialogComponent (sc-1450)', () => {
  let dialogRef: { close: jest.Mock };
  let log: { uploadPicture: jest.Mock };

  /**
   * Builds the dialogue for an entry.
   *
   * @param currentAlt - The description already on its picture, if any.
   * @returns The dialogue and its element.
   */
  const render = (currentAlt: string | null = null) => {
    const data: LogPictureDialogData = {
      entryId: 'entry-1',
      scopeName: 'Arrival at the Azure Nebula',
      currentAlt,
    };

    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });

    const fixture = TestBed.createComponent(LogPictureDialogComponent);

    fixture.detectChanges();

    return {
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    log = {
      uploadPicture: jest
        .fn()
        .mockReturnValue(of({ assetId: 'asset-1', status: 'SCANNING' })),
    };

    TestBed.configureTestingModule({
      imports: [LogPictureDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: CaptainsLogService, useValue: log },
        {
          provide: AssetScanService,
          useValue: {
            watch: jest
              .fn()
              .mockReturnValue(
                of({ state: 'AVAILABLE', settled: true, gaveUp: false }),
              ),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names the entry and holds the crop to a 16:9 picture', () => {
    const { component, element } = render();

    expect(element.textContent).toContain('Picture');
    expect(element.textContent).toContain('Arrival at the Azure Nebula');
    expect(element.textContent).toContain('16:9');
    expect(component.spec.endpoint).toBe('picture');
    expect(component.altMaxLength).toBe(300);
  });

  it('starts from the description the picture already has', () => {
    expect(render('The old viewscreen').component.altText).toBe(
      'The old viewscreen',
    );
  });

  it('sends the crop and its trimmed description to the entry, and closes once it is in use', () => {
    const { component } = render();

    component.croppedImageBlob = new Blob(['data'], { type: 'image/jpeg' });
    component.croppedImage = 'data:image/jpeg;base64,abc';
    component.croppedImageWidth = 1920;
    component.croppedImageHeight = 1080;
    component.altText = '  The bridge at red alert  ';

    component.onUploadImageClick();

    expect(log.uploadPicture).toHaveBeenCalledWith(
      'entry-1',
      component.croppedImageBlob,
      'The bridge at red alert',
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
