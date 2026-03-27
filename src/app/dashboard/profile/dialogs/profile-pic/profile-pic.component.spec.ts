import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { of, throwError } from 'rxjs';

import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import {
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { ProfilePicComponent } from './profile-pic.component';

describe('ProfilePicComponent', () => {
  let component: ProfilePicComponent;
  let fixture: ComponentFixture<ProfilePicComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockDialogRef: jest.Mocked<MatDialogRef<ProfilePicComponent>>;
  let mockSanitizer: jest.Mocked<DomSanitizer>;

  beforeEach(async () => {
    mockDashboardService = {
      updateProfilePic: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;

    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<ProfilePicComponent>>;

    mockSanitizer = {
      bypassSecurityTrustUrl: jest.fn().mockImplementation(val => val),
    } as unknown as jest.Mocked<DomSanitizer>;

    await TestBed.configureTestingModule({
      imports: [ProfilePicComponent, MatDialogModule, NoopAnimationsModule],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onFileChangeEvent', () => {
    it('should set imageChangedEvent and check item type', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.imageChangedEvent).toBe(event);
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should set uploadedInvalidImageType to true for non-image files', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(true);
    });

    it('should block SVG files and set uploadedInvalidImageType to true', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const file = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileChangeEvent(event);

      expect(component.uploadedInvalidImageType).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        'SVG files are not allowed for security reasons',
      );
    });

    it('should return early if event is null', () => {
      component.onFileChangeEvent(null as unknown as Event);
      expect(component.imageChangedEvent).toBeNull();
    });

    it('should return early if event.target is missing', () => {
      const event = {} as Event;
      component.onFileChangeEvent(event);
      expect(component.imageChangedEvent).toBe(event);
    });

    it('should handle event.target existing but files being null', () => {
      const event = { target: {} } as unknown as Event;
      component.onFileChangeEvent(event);
      expect(component.imageChangedEvent).toBe(event);
    });
  });

  it('should handle image cropped event', done => {
    const blob = new Blob(['test-image'], { type: 'image/png' });
    const event = { blob } as ImageCroppedEvent;

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onloadend: null as unknown as () => void,
      result: 'data:image/png;base64,test',
    };
    jest
      .spyOn(window, 'FileReader')
      .mockImplementation(() => mockFileReader as unknown as FileReader);

    component.onImageCropped(event);

    expect(component.croppedImageBlob).toBe(blob);
    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(blob);

    // Trigger onloadend
    mockFileReader.onloadend();

    setTimeout(() => {
      expect(component.croppedImage).toBe('data:image/png;base64,test');
      expect(mockSanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
      done();
    });
  });

  it('should log error if cropped event has no blob', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    component.onImageCropped({} as ImageCroppedEvent);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Cropped image is not defined correctly',
    );
    consoleSpy.mockRestore();
  });

  describe('onUploadImageClick', () => {
    it('should show error if no image is cropped', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.onUploadImageClick();
      expect(component.errorMessage).toBe(
        'Please crop an image before uploading.',
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show error if image is not PNG', () => {
      component.croppedImageBlob = new Blob([''], { type: 'image/jpeg' });
      component.onUploadImageClick();
      expect(component.errorMessage).toBe(
        'The cropped image must be in PNG format.',
      );
    });

    it('should upload image successfully', () => {
      component.croppedImageBlob = new Blob(['test'], { type: 'image/png' });
      mockDashboardService.updateProfilePic.mockReturnValue(of({}));

      component.onUploadImageClick();

      expect(mockDashboardService.updateProfilePic).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should handle upload error 400', () => {
      component.croppedImageBlob = new Blob(['test'], { type: 'image/png' });
      mockDashboardService.updateProfilePic.mockReturnValue(
        throwError(() => ({ status: 400 })),
      );

      component.onUploadImageClick();

      expect(component.errorMessage).toBe(
        MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
      );
    });

    it('should handle upload error 0', () => {
      component.croppedImageBlob = new Blob(['test'], { type: 'image/png' });
      mockDashboardService.updateProfilePic.mockReturnValue(
        throwError(() => ({ status: 0 })),
      );

      component.onUploadImageClick();

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    });

    it('should handle unexpected upload error', () => {
      component.croppedImageBlob = new Blob(['test'], { type: 'image/png' });
      mockDashboardService.updateProfilePic.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      component.onUploadImageClick();

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    });

    it('should show error if blob size is 0', () => {
      component.croppedImageBlob = new Blob([], { type: 'image/png' });
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.onUploadImageClick();
      expect(component.errorMessage).toBe('Failed to upload image.');
      expect(consoleSpy).toHaveBeenCalledWith('Blob is empty');
      consoleSpy.mockRestore();
    });

    it('should handle errors during processing', () => {
      component.croppedImageBlob = new Blob(['test'], { type: 'image/png' });
      // Mocking FormData to throw
      const originalFormData = globalThis.FormData;
      globalThis.FormData = jest.fn().mockImplementation(() => {
        throw new Error('Form data error');
      }) as unknown as typeof FormData;

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.onUploadImageClick();
      expect(component.errorMessage).toBe('Invalid image format.');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing image blob:',
        expect.anything(),
      );

      globalThis.FormData = originalFormData;
      consoleSpy.mockRestore();
    });
  });

  it('should return early if no file is selected', () => {
    const event = { target: { files: [] } } as unknown as Event;
    component.onFileChangeEvent(event);
    expect(component.uploadedInvalidImageType).toBe(false);
  });

  it('should handle loadImageFailed', () => {
    component.uploadedInvalidImageType = true;
    component.loadImageFailed();
    expect(component.errorMessage).toBe('Failed to load image');
    expect(component.croppedImageBlob).toBeNull();

    component.uploadedInvalidImageType = false;
    component.loadImageFailed();
    expect(component.errorMessage).toBe(
      'Invalid image type. Please upload an image.',
    );
  });

  it('should close dialog', () => {
    component.onCloseClick();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should reset error message after timeout', fakeAsync(() => {
    component.displayErrorMessage('Oops');
    expect(component.errorMessage).toBe('Oops');
    tick(component.showErrorMilliseconds);
    expect(component.errorMessage).toBe('');
  }));
});
