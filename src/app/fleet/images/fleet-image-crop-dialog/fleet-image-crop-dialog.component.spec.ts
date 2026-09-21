import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';

import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';
import { AssetScanService } from 'src/app/shared/services/asset-scan.service';

import { FleetImageSlot } from '../../fleet-image.constants';
import {
  FleetArtworkTarget,
  FleetImageService,
} from '../../fleet-image.service';
import {
  FleetImageCropData,
  FleetImageCropDialogComponent,
} from './fleet-image-crop-dialog.component';

const COMMUNITY_TARGET: FleetArtworkTarget = {
  kind: 'COMMUNITY',
  communityId: 'community-1',
};

describe('FleetImageCropDialogComponent', () => {
  let fixture: ComponentFixture<FleetImageCropDialogComponent>;
  let component: FleetImageCropDialogComponent;
  let dialogRef: { close: jest.Mock };
  let imageService: { upload: jest.Mock; remove: jest.Mock };
  let assetScan: { watch: jest.Mock };

  /**
   * Builds the dialogue for a slot.
   *
   * @param slot - Which picture is being set.
   * @param currentAlt - The description already on the slot, if any.
   * @param target - Whose artwork it is.
   * @returns The rendered element.
   */
  const render = (
    slot: FleetImageSlot = FleetImageSlot.BANNER,
    currentAlt: string | null = null,
    target: FleetArtworkTarget = COMMUNITY_TARGET,
  ): HTMLElement => {
    const data: FleetImageCropData = {
      slot,
      target,
      scopeName: 'Jupiter Force',
      currentAlt,
    };

    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });

    fixture = TestBed.createComponent(FleetImageCropDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Puts a crop of the given size on the component.
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
      upload: jest
        .fn()
        .mockReturnValue(of({ assetId: 'asset-1', status: 'SCANNING' })),
      remove: jest.fn(),
    };
    assetScan = {
      watch: jest
        .fn()
        .mockReturnValue(
          of({ state: 'AVAILABLE', settled: true, gaveUp: false }),
        ),
    };

    TestBed.configureTestingModule({
      imports: [FleetImageCropDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FleetImageService, useValue: imageService },
        { provide: AssetScanService, useValue: assetScan },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /*
   * The crop rules come from the slot rather than from the dialogue, so the
   * size somebody is asked for and the size the server insists on are one
   * statement rather than two that agree today.
   */
  it('takes its shape, size and encoding from the slot', () => {
    const element = render(FleetImageSlot.BANNER);

    expect(component.spec.aspectRatio).toBeCloseTo(5);
    expect(component.spec.outputFormat).toBe('jpeg');
    expect(element.textContent).toContain('5:1, 2400 by 480 pixels or larger');
  });

  /*
   * Unlike the banner, the emblem has a smaller variant to fall back on, so
   * there is a width at which it is usable but soft — and the sentence has to
   * name both sizes rather than one.
   */
  it('names both sizes for a slot whose minimum is not its recommendation', () => {
    const element = render(FleetImageSlot.EMBLEM);

    expect(component.spec.aspectRatio).toBeCloseTo(1);
    expect(component.spec.outputFormat).toBe('png');
    expect(element.textContent).toContain(
      'ideally 512 by 512 pixels or larger',
    );
    expect(element.textContent).toContain('300 by 300 at the smallest');
  });

  it('says which record and which picture it is filling', () => {
    const element = render(FleetImageSlot.EMBLEM);

    expect(element.textContent).toContain('Emblem');
    expect(element.textContent).toContain('Jupiter Force');
  });

  it('starts from the description already on the slot', () => {
    render(FleetImageSlot.BANNER, 'The Jupiter shipyards at dawn');

    expect(component.altText).toBe('The Jupiter shipyards at dawn');
  });

  describe('whether it can upload yet', () => {
    it('cannot without a crop', () => {
      render();
      component.altText = 'A ship';

      expect(component.canUpload).toBe(false);
    });

    /*
     * A picture nobody has described is simply absent to a reader using a
     * screen reader, so the description is part of the upload rather than
     * something to add afterwards.
     */
    it('cannot without a description', () => {
      render();
      withCrop(2400, 480);
      component.altText = '   ';

      expect(component.canUpload).toBe(false);
    });

    it('can with both', () => {
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';

      expect(component.canUpload).toBe(true);
    });

    it('cannot while an upload is already in flight', () => {
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';
      component.isSubmitting = true;

      expect(component.canUpload).toBe(false);
    });
  });

  describe('sending the picture', () => {
    it('sends the crop and its description to the record it was opened for', () => {
      render(FleetImageSlot.BANNER, null, {
        kind: 'STANDALONE_FLEET',
        fleetId: 'fleet-9',
      });
      withCrop(2400, 480);
      component.altText = '  A ship  ';

      component.onUploadImageClick();

      expect(imageService.upload).toHaveBeenCalledWith(
        { kind: 'STANDALONE_FLEET', fleetId: 'fleet-9' },
        FleetImageSlot.BANNER,
        component.croppedImageBlob,
        'A ship',
      );
    });

    /*
     * Nothing has changed when the request finishes. The picture is held
     * privately and scanned first, and the dialogue stays open reporting
     * where it has got to — FC-012.
     */
    it('follows the scan rather than closing on the answer', () => {
      render();
      withCrop(2400, 480);
      component.altText = 'A ship';

      component.onUploadImageClick();

      expect(assetScan.watch).toHaveBeenCalledWith('asset-1', 'SCANNING');
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('refuses a crop below the size the slot needs', () => {
      render(FleetImageSlot.EMBLEM);

      withCrop(200, 200, 'image/png');
      component.altText = 'A badge';

      component.onUploadImageClick();

      expect(imageService.upload).not.toHaveBeenCalled();
      expect(component.errorMessage).toContain('at least 300 by 300 is needed');
    });

    /*
     * The server names the specific problem — a crop too small, a picture
     * over the limit, somebody else's work in the slot — which is more use
     * than a generic failure.
     */
    it('repeats what the server said went wrong', () => {
      imageService.upload.mockReturnValue(
        throwError(() => ({
          status: 403,
          error: { message: 'Somebody else put that picture there.' },
        })),
      );

      const element = render();

      withCrop(2400, 480);
      component.altText = 'A ship';

      component.onUploadImageClick();
      fixture.detectChanges();

      expect(element.textContent).toContain(
        'Somebody else put that picture there.',
      );
      expect(component.isSubmitting).toBe(false);
    });

    it('falls back to its own wording when the server said nothing', () => {
      imageService.upload.mockReturnValue(throwError(() => ({ status: 0 })));

      const element = render();

      withCrop(2400, 480);
      component.altText = 'A ship';

      component.onUploadImageClick();
      fixture.detectChanges();

      expect(element.textContent).toContain(
        MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
      );
    });

    /*
     * Reachable only by clearing the field between the button being enabled
     * and the click landing, which the disabled state makes unlikely rather
     * than impossible — and an upload with an empty description would be a
     * picture nobody can read.
     */
    it('refuses a description that is nothing but spaces', () => {
      render();

      withCrop(2400, 480);
      component.altText = '   ';

      component.onUploadImageClick();

      expect(imageService.upload).not.toHaveBeenCalled();
      expect(component.errorMessage).toContain(
        'Please describe what the picture shows',
      );
    });
  });
});
