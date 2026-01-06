import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import {
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { CharacterPicComponent } from './character-pic.component';

describe('CharacterPicComponent', () => {
  let component: CharacterPicComponent;
  let fixture: ComponentFixture<CharacterPicComponent>;
  let mockCharacterService: jest.Mocked<
    Pick<CharacterService, 'updateCharacterProfilePic'>
  >;
  let mockDialogRef: jest.Mocked<
    Pick<MatDialogRef<CharacterPicComponent>, 'close'>
  >;
  let mockSanitizer: jest.Mocked<Pick<DomSanitizer, 'bypassSecurityTrustUrl'>>;

  const mockCharacter = {
    id: 'char1',
    handle: 'TestChar',
  } as Character;

  beforeEach(async () => {
    mockCharacterService = {
      updateCharacterProfilePic: jest.fn().mockReturnValue(of({})),
    };

    mockDialogRef = {
      close: jest.fn(),
    };

    mockSanitizer = {
      bypassSecurityTrustUrl: jest
        .fn()
        .mockImplementation((url: string) => url),
    };

    await TestBed.configureTestingModule({
      imports: [CharacterPicComponent, NoopAnimationsModule],
      providers: [
        { provide: CharacterService, useValue: mockCharacterService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { character: mockCharacter } },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterPicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onFileChangeEvent', () => {
    it('should return if event is null', () => {
      component.onFileChangeEvent(null as unknown as Event);
      expect(component.imageChangedEvent).toBeNull(); // or remains what it was, but here it sets it to event (null) logic check?
      // line 64: this.imageChangedEvent = event;
    });

    it('should handle valid image file', () => {
      const mockFile = { type: 'image/png', name: 'test.png' };
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.uploadedInvalidImageType).toBe(false);
      expect(component.imageChangedEvent).toBe(mockEvent);
    });

    it('should set invalid type error if file is not image', () => {
      const mockFile = { type: 'text/plain', name: 'test.txt' };
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.uploadedInvalidImageType).toBe(true);
    });

    it('should block SVG files for security', () => {
      const mockFile = { type: 'image/svg+xml', name: 'test.svg' };
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      component.onFileChangeEvent(mockEvent);
      expect(component.uploadedInvalidImageType).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'SVG files are not allowed for security reasons',
      );
      consoleSpy.mockRestore();
    });

    it('should reject file with valid MIME but invalid extension', () => {
      const mockFile = { type: 'image/png', name: 'test.bmp' };
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.uploadedInvalidImageType).toBe(true);
    });

    it('should accept JPEG files', () => {
      const mockFile = { type: 'image/jpeg', name: 'test.jpg' };
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should do nothing if no files provided in target', () => {
      const mockEvent = { target: { files: [] } } as unknown as Event; // Empty files
      component.onFileChangeEvent(mockEvent);
      // logic checked lines 72-74
      expect(component.uploadedInvalidImageType).toBe(false);
    });

    it('should return if event target is null', () => {
      const mockEvent = { target: null } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.imageChangedEvent).toBe(mockEvent);
    });

    it('should return if target files is null', () => {
      const mockEvent = { target: { files: null } } as unknown as Event;
      component.onFileChangeEvent(mockEvent);
      expect(component.imageChangedEvent).toBe(mockEvent);
    });
  });

  describe('onImageCropped', () => {
    let originalFileReader: typeof FileReader;

    beforeAll(() => {
      originalFileReader = window.FileReader;
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: {
          result: string;
          onloadend: (() => void) | null;
        }) {
          setTimeout(() => {
            this.result = 'data:image/png;base64,mock';
            if (this.onloadend) this.onloadend();
          }, 0);
        }),
        onloadend: null,
        result: '',
      };
      window.FileReader = jest.fn(
        () => mockFileReader,
      ) as unknown as typeof FileReader;
    });

    afterAll(() => {
      window.FileReader = originalFileReader;
    });

    it('should handle cropped image blob', fakeAsync(() => {
      const blob = new Blob([''], { type: 'image/png' });
      const event: ImageCroppedEvent = {
        blob: blob,
        objectUrl: 'url',
        width: 100,
        height: 100,
        cropperPosition: { x1: 0, y1: 0, x2: 100, y2: 100 },
        imagePosition: { x1: 0, y1: 0, x2: 100, y2: 100 },
      };

      component.onImageCropped(event);
      tick(); // wait for filereader

      expect(component.croppedImageBlob).toBe(blob);
      expect(mockSanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith(
        'data:image/png;base64,mock',
      );
    }));

    it('should log error if blob is missing', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const event: ImageCroppedEvent = {} as ImageCroppedEvent;
      component.onImageCropped(event);
      expect(spy).toHaveBeenCalledWith(
        'Cropped image is not defined correctly',
      );
      spy.mockRestore();
    });
  });

  describe('onUploadImageClick', () => {
    it('should error if no cropped image blob', () => {
      const spyConsole = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.croppedImageBlob = null;
      const spyDisplay = jest.spyOn(component, 'displayErrorMessage');
      component.onUploadImageClick();
      expect(spyDisplay).toHaveBeenCalledWith(
        'Please crop an image before uploading.',
      );
      spyConsole.mockRestore();
    });

    it('should error if blob type is not png', () => {
      const spyConsole = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.croppedImageBlob = { type: 'image/jpeg' } as Blob;
      const spyDisplay = jest.spyOn(component, 'displayErrorMessage');
      component.onUploadImageClick();
      expect(spyDisplay).toHaveBeenCalledWith(
        'The cropped image must be in PNG format.',
      );
      spyConsole.mockRestore();
    });

    it('should upload valid png blob', () => {
      const blob = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(blob, 'size', { value: 100 });
      component.croppedImageBlob = blob;

      component.onUploadImageClick();
      expect(mockCharacterService.updateCharacterProfilePic).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should handle blob empty size', () => {
      const spyConsole = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const blob = new Blob([], { type: 'image/png' }); // size 0
      component.croppedImageBlob = blob;
      const spyDisplay = jest.spyOn(component, 'displayErrorMessage');

      component.onUploadImageClick();
      expect(spyDisplay).toHaveBeenCalledWith('Failed to upload image.');
      spyConsole.mockRestore();
    });

    describe('Error Handling', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        const blob = new Blob(['data'], { type: 'image/png' });
        Object.defineProperty(blob, 'size', { value: 100 });
        component.croppedImageBlob = blob;
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should handle 400 error', () => {
        const spy = jest.spyOn(component, 'displayErrorMessage');
        mockCharacterService.updateCharacterProfilePic.mockReturnValue(
          throwError(() => ({ status: 400 })),
        );
        component.onUploadImageClick();
        expect(spy).toHaveBeenCalledWith(
          MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
        );
      });

      it('should handle status 0 error', () => {
        const spy = jest.spyOn(component, 'displayErrorMessage');
        mockCharacterService.updateCharacterProfilePic.mockReturnValue(
          throwError(() => ({ status: 0 })),
        );
        component.onUploadImageClick();
        expect(spy).toHaveBeenCalledWith(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      });

      it('should handle unexpected error', () => {
        const spy = jest.spyOn(component, 'displayErrorMessage');
        mockCharacterService.updateCharacterProfilePic.mockReturnValue(
          throwError(() => ({ status: 500 })),
        );
        component.onUploadImageClick();
        expect(spy).toHaveBeenCalledWith(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      });

      it('should catch synchronous errors (e.g. mock crash)', () => {
        const spy = jest.spyOn(component, 'displayErrorMessage');
        // We need valid blob properties for earlier checks (lines 112, 118)
        // The try block starts at 124.
        // Line 125: const blob = this.croppedImageBlob;
        // Line 127: if (blob?.size > 0)
        // So if we make .size throw, it triggers catch block.

        const blob = { type: 'image/png' };
        Object.defineProperty(blob, 'size', {
          get: () => {
            throw new Error('Access Error');
          },
        });

        component.croppedImageBlob = blob as Blob;

        component.onUploadImageClick();
        expect(spy).toHaveBeenCalledWith('Invalid image format.');
      });
    });
  });

  describe('loadImageFailed', () => {
    it('should display error for invalid image type', () => {
      component.uploadedInvalidImageType = true;
      const spy = jest.spyOn(component, 'displayErrorMessage');
      component.loadImageFailed();
      expect(spy).toHaveBeenCalledWith('Failed to load image');
      expect(component.cropper).toBeNull();
    });

    it('should display general error if not invalid image type', () => {
      component.uploadedInvalidImageType = false;
      const spy = jest.spyOn(component, 'displayErrorMessage');
      component.loadImageFailed();
      expect(spy).toHaveBeenCalledWith(
        'Invalid image type. Please upload an image.',
      );
    });
  });

  it('should reset error message after timeout', fakeAsync(() => {
    component.showErrorMilliseconds = 100;
    component.displayErrorMessage('Error');
    expect(component.errorMessage).toBe('Error');
    tick(100);
    expect(component.errorMessage).toBe('');
  }));

  it('onCloseClick should close dialog', () => {
    component.onCloseClick();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
