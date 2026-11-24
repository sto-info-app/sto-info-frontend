import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of } from 'rxjs';

import { NewsService } from 'src/app/news/news.service';
import { AssetScanService } from 'src/app/shared/services/asset-scan.service';

import {
  NewsCoverDialogComponent,
  NewsCoverDialogData,
} from './news-cover-dialog.component';

describe('NewsCoverDialogComponent', () => {
  let fixture: ComponentFixture<NewsCoverDialogComponent>;
  let component: NewsCoverDialogComponent;
  let dialogRef: { close: jest.Mock };
  let newsService: { uploadCover: jest.Mock };

  /**
   * Builds the dialogue for a post.
   *
   * @param currentAlt - The description already on its cover, if any.
   * @returns The rendered element.
   */
  const render = (currentAlt: string | null = null): HTMLElement => {
    const data: NewsCoverDialogData = {
      postId: 'post-1',
      scopeName: 'Version 1.5 release notes',
      currentAlt,
    };

    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });

    fixture = TestBed.createComponent(NewsCoverDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /** Puts a cover-sized crop on the component. */
  const withCrop = (): void => {
    component.croppedImageBlob = new Blob(['data'], { type: 'image/jpeg' });
    component.croppedImage = 'data:image/jpeg;base64,abc';
    component.croppedImageWidth = 1920;
    component.croppedImageHeight = 1080;
  };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    newsService = {
      uploadCover: jest
        .fn()
        .mockReturnValue(of({ assetId: 'asset-1', status: 'SCANNING' })),
    };

    TestBed.configureTestingModule({
      imports: [NewsCoverDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: NewsService, useValue: newsService },
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

  it('names the post and holds the crop to a 16:9 cover', () => {
    const element = render();

    expect(element.textContent).toContain('Cover');
    expect(element.textContent).toContain('Version 1.5 release notes');
    expect(element.textContent).toContain('16:9');
    expect(component.spec).toEqual(
      expect.objectContaining({
        minimumWidth: 640,
        minimumHeight: 360,
        outputFormat: 'jpeg',
        endpoint: 'cover-image',
      }),
    );
  });

  it('starts from the description the cover already has', () => {
    render('The old shipyard');

    expect(component.altText).toBe('The old shipyard');
  });

  it('will not upload a picture nobody has described', () => {
    render();
    withCrop();
    component.altText = '   ';

    expect(component.canUpload).toBe(false);
  });

  it('sends the crop and its trimmed description to the post, and closes once it is in use', () => {
    render();
    withCrop();
    component.altText = '  The new shipyard  ';

    component.onUploadImageClick();

    expect(newsService.uploadCover).toHaveBeenCalledWith(
      'post-1',
      component.croppedImageBlob,
      'The new shipyard',
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
