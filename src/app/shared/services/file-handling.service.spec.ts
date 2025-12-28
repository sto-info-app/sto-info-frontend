import { TestBed } from '@angular/core/testing';
import { Base64 } from 'js-base64';
import { FileHandlingService } from './file-handling.service';

describe('FileHandlingService', () => {
  let service: FileHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileHandlingService],
    });
    service = TestBed.inject(FileHandlingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateBase64Image', () => {
    const cases = [
      { input: 'data:image/png;base64,valid', expected: true },
      { input: 'data:image/jpeg;base64,valid', expected: true },
      { input: 'data:image/jpg;base64,valid', expected: true },
      { input: 'data:application/pdf;base64,valid', expected: false },
      { input: 'invalid', expected: false },
    ];

    test.each(cases)(
      'should return $expected for input "$input"',
      ({ input, expected }) => {
        expect(service.validateBase64Image(input)).toBe(expected);
      },
    );
  });

  describe('dataURItoBlob', () => {
    it('should convert valid dataURI to Blob', () => {
      // A tiny 1x1 png base64
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const dataURI = `data:image/png;base64,${base64}`;

      const blob = service.dataURItoBlob(dataURI);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle error in conversion', () => {
      // Malformed URI that will cause error
      const malformed = 'invalid';

      expect(() => service.dataURItoBlob(malformed)).toThrow();
    });

    it('should throw error for invalid base64 content', () => {
      const invalidBase64 = 'data:image/png;base64,ABC';
      // Assuming Base64 is imported or globally available for jest.spyOn
      // If Base64 is a utility within FileHandlingService, it might need a different mocking approach
      // For this example, I'm assuming Base64 is a separate module/object that can be spied on.
      // If it's an internal helper, you might need to mock the internal method or the service itself.
      // For a typical Angular setup, if Base64 is a dependency, it would be injected or imported.
      // If it's a simple helper function, it might be harder to mock directly without refactoring.
      // Assuming `Base64` is an object/module that can be spied on.
      const isValidSpy = jest.spyOn(Base64, 'isValid').mockReturnValue(false);
      try {
        expect(() => service.dataURItoBlob(invalidBase64)).toThrow(
          'Invalid base64 string',
        );
      } finally {
        isValidSpy.mockRestore();
      }
    });

    it('should clean base64 string with invalid characters', () => {
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\n ';
      const dataURI = `data:image/png;base64,${base64}`;
      const blob = service.dataURItoBlob(dataURI);
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
