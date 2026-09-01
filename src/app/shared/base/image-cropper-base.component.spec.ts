import { Component, NO_ERRORS_SCHEMA, inject } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import {
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { ImageCropperBaseComponent } from './image-cropper-base.component';

// Minimal concrete subclass used only for testing the base class
@Component({
  selector: 'app-test-image-cropper',
  template: '',
  standalone: true,
})
class TestImageCropperComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<TestImageCropperComponent>,
  );

  // Expose protected methods for direct testing
  callValidateCroppedImage(): boolean {
    return this.validateCroppedImage();
  }

  callHandleHttpError(error: { status: number }): void {
    return this.handleHttpError(error);
  }

  callResetCropperState(): void {
    return this.resetCropperState();
  }

  // A destination whose picture is wide and photographic overrides these; the
  // defaults keep the profile and character pictures exactly as they were.
  expectJpegAtLeast(width: number, height: number): void {
    this.outputFormat = 'jpeg';
    this.minimumCroppedWidth = width;
    this.minimumCroppedHeight = height;
  }
}

describe('ImageCropperBaseComponent', () => {
  let component: TestImageCropperComponent;
  let fixture: ComponentFixture<TestImageCropperComponent>;
  let mockDialogRef: jest.Mocked<
    Pick<MatDialogRef<TestImageCropperComponent>, 'close'>
  >;
  let mockSanitizer: jest.Mocked<Pick<DomSanitizer, 'bypassSecurityTrustUrl'>>;

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };
    mockSanitizer = {
      bypassSecurityTrustUrl: jest.fn().mockImplementation(url => url),
    };

    await TestBed.configureTestingModule({
      imports: [TestImageCropperComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TestImageCropperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  describe('onFileChangeEvent', () => {
    it('should set imageChangedEvent and accept a valid PNG file', () => {
      const file = { type: 'image/png', name: 'photo.png' };
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.imageChangedEvent).toBe(event);
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should accept a valid JPEG file', () => {
      const file = { type: 'image/jpeg', name: 'photo.jpg' };
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should block SVG files and warn', () => {
      const file = { type: 'image/svg+xml', name: 'icon.svg' };
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        'SVG files are not allowed for security reasons',
      );
    });

    it('should block a file with valid MIME type but invalid extension', () => {
      const file = { type: 'image/png', name: 'photo.bmp' };
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid file type attempted:',
        'image/png',
        'photo.bmp',
      );
    });

    it('should block a file with invalid MIME type', () => {
      const file = { type: 'text/plain', name: 'file.txt' };
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(true);
    });

    it('should reset uploadedInvalidImageType and errorMessage on each call', () => {
      component.uploadedInvalidImageType = true;
      component.errorMessage = 'Previous error';

      const file = { type: 'image/png', name: 'photo.png' };
      const event = { target: { files: [file] } } as unknown as Event;
      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(false);
      expect(component.errorMessage).toBe('');
    });

    it('should set imageChangedEvent and return early if event is null', () => {
      component.onFileChangeEvent(null as unknown as Event);

      expect(component.imageChangedEvent).toBeNull();
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should set imageChangedEvent and return early if event has no target', () => {
      const event = {} as Event;
      component.onFileChangeEvent(event);

      expect(component.imageChangedEvent).toBe(event);
    });

    it('should return early if target has no files', () => {
      const event = { target: { files: null } } as unknown as Event;
      component.onFileChangeEvent(event);

      expect(component.imageChangedEvent).toBe(event);
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should return early if files array is empty', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('onImageCropped', () => {
    it('should set croppedImageBlob and generate a preview via FileReader', fakeAsync(() => {
      const blob = new Blob(['data'], { type: 'image/png' });
      const mockReader = {
        readAsDataURL: jest.fn(),
        onloadend: null as unknown as () => void,
        result: 'data:image/png;base64,abc',
      };
      jest
        .spyOn(window, 'FileReader')
        .mockImplementation(() => mockReader as unknown as FileReader);

      component.onImageCropped({
        blob,
        width: 2400,
        height: 480,
      } as ImageCroppedEvent);

      expect(component.croppedImageBlob).toBe(blob);
      // Kept so the size can be checked, and shown, before an upload that the
      // destination was never going to accept.
      expect(component.croppedImageWidth).toBe(2400);
      expect(component.croppedImageHeight).toBe(480);
      expect(mockReader.readAsDataURL).toHaveBeenCalledWith(blob);

      mockReader.onloadend();
      tick();

      expect(mockSanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith(
        'data:image/png;base64,abc',
      );
      expect(component.croppedImage).toBe('data:image/png;base64,abc');
    }));

    it('should log an error and return early if blob is missing', () => {
      component.onImageCropped({} as ImageCroppedEvent);

      expect(console.error).toHaveBeenCalledWith(
        'Cropped image is not defined correctly',
      );
      expect(component.croppedImageBlob).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('loadImageFailed', () => {
    it('should reset cropper state and show "Failed to load image" when uploadedInvalidImageType is true', () => {
      component.uploadedInvalidImageType = true;
      component.croppedImageBlob = new Blob(['x'], { type: 'image/png' });

      component.loadImageFailed();

      expect(component.errorMessage).toBe('Failed to load image');
      expect(component.croppedImageBlob).toBeNull();
      expect(component.imageChangedEvent).toBeNull();
    });

    it('should reset cropper state and show generic error when uploadedInvalidImageType is false', () => {
      component.uploadedInvalidImageType = false;

      component.loadImageFailed();

      expect(component.errorMessage).toBe(
        'Invalid image type. Please upload an image.',
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('onCloseClick', () => {
    it('should call dialogRef.close()', () => {
      component.onCloseClick();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('displayErrorMessage / resetErrorMessage', () => {
    it('should set errorMessage immediately', () => {
      component.displayErrorMessage('Something went wrong');

      expect(component.errorMessage).toBe('Something went wrong');
    });

    it('should clear errorMessage after showErrorMilliseconds', fakeAsync(() => {
      component.showErrorMilliseconds = 100;
      component.displayErrorMessage('Temporary error');

      expect(component.errorMessage).toBe('Temporary error');
      tick(100);
      expect(component.errorMessage).toBe('');
    }));

    it('should clear errorMessage immediately via resetErrorMessage', () => {
      component.errorMessage = 'Some error';
      component.resetErrorMessage();

      expect(component.errorMessage).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  describe('validateCroppedImage (protected)', () => {
    it('should return false and show error when croppedImageBlob is null', () => {
      component.croppedImageBlob = null;

      const result = component.callValidateCroppedImage();

      expect(result).toBe(false);
      expect(component.errorMessage).toBe(
        'Please crop an image before uploading.',
      );
      expect(console.error).toHaveBeenCalledWith('No image to upload');
    });

    it('should return false and show error when blob is not PNG', () => {
      component.croppedImageBlob = new Blob([''], { type: 'image/jpeg' });

      const result = component.callValidateCroppedImage();

      expect(result).toBe(false);
      expect(component.errorMessage).toBe(
        'The cropped image must be in PNG format.',
      );
      expect(console.error).toHaveBeenCalledWith(
        'Cropped image is not in PNG format',
      );
    });

    it('should return false and show error when blob size is 0', () => {
      component.croppedImageBlob = new Blob([], { type: 'image/png' });

      const result = component.callValidateCroppedImage();

      expect(result).toBe(false);
      expect(component.errorMessage).toBe('Failed to upload image.');
      expect(console.error).toHaveBeenCalledWith('Blob is empty');
    });

    it('should return true for a valid PNG blob with content', () => {
      component.croppedImageBlob = new Blob(['data'], { type: 'image/png' });

      const result = component.callValidateCroppedImage();

      expect(result).toBe(true);
      expect(component.errorMessage).toBe('');
    });

    // A banner reaches its reader at 2400 x 480 through a fixed Cloudflare
    // variant, so anything under that would be delivered enlarged. Saying so
    // here means saying it while the picture is still on the screen.
    it('should refuse a crop smaller than the destination needs', () => {
      component.expectJpegAtLeast(2400, 480);
      component.croppedImageBlob = new Blob(['data'], { type: 'image/jpeg' });
      component.croppedImageWidth = 1200;
      component.croppedImageHeight = 240;

      const result = component.callValidateCroppedImage();

      expect(result).toBe(false);
      expect(component.errorMessage).toContain('1200 by 240');
      expect(component.errorMessage).toContain('2400 by 480');
    });

    it('should accept a crop that reaches the minimum', () => {
      component.expectJpegAtLeast(2400, 480);
      component.croppedImageBlob = new Blob(['data'], { type: 'image/jpeg' });
      component.croppedImageWidth = 2400;
      component.croppedImageHeight = 480;

      expect(component.callValidateCroppedImage()).toBe(true);
    });

    it('should name the format the destination asked for', () => {
      component.expectJpegAtLeast(0, 0);
      component.croppedImageBlob = new Blob(['data'], { type: 'image/png' });

      const result = component.callValidateCroppedImage();

      expect(result).toBe(false);
      expect(component.errorMessage).toBe(
        'The cropped image must be in JPEG format.',
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('handleHttpError (protected)', () => {
    it('should display the status-0 message for status 0', () => {
      component.callHandleHttpError({ status: 0 });

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    });

    it('should display the status-400 message for status 400', () => {
      component.callHandleHttpError({ status: 400 });

      expect(component.errorMessage).toBe(
        MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
      );
    });

    it('should fall back to the status-0 message for unexpected status codes', () => {
      component.callHandleHttpError({ status: 500 });

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      expect(console.error).toHaveBeenCalledWith('Unexpected Error:', {
        status: 500,
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('resetCropperState (protected)', () => {
    it('should clear all cropper-related state', () => {
      component.croppedImageBlob = new Blob(['x'], { type: 'image/png' });
      component.croppedImage = 'data:image/png;base64,abc';
      component.croppedImageWidth = 800;
      component.croppedImageHeight = 600;
      component.imageChangedEvent = {} as Event;

      component.callResetCropperState();

      expect(component.cropper).toBeNull();
      expect(component.croppedImage).toBe('');
      expect(component.croppedImageBlob).toBeNull();
      expect(component.croppedImageWidth).toBe(0);
      expect(component.croppedImageHeight).toBe(0);
      expect(component.imageChangedEvent).toBeNull();
    });
  });
});
