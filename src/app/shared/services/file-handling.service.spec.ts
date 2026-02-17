import { TestBed } from '@angular/core/testing';
import { Base64 } from 'js-base64';
import { FileHandlingService } from './file-handling.service';

describe('FileHandlingService', () => {
  let service: FileHandlingService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileHandlingService],
    });
    service = TestBed.inject(FileHandlingService);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('validateBase64Image', () => {
    it('should return true for valid image data URIs', () => {
      expect(service.validateBase64Image('data:image/png;base64,AAAA')).toBe(
        true,
      );

      expect(service.validateBase64Image('data:image/jpeg;base64,AAAA')).toBe(
        true,
      );

      expect(service.validateBase64Image('data:image/jpg;base64,AAAA')).toBe(
        true,
      );
    });

    it('should return false for non-image / invalid data URIs', () => {
      expect(service.validateBase64Image('AAAA')).toBe(false);
      expect(service.validateBase64Image('data:text/plain;base64,AAAA')).toBe(
        false,
      );
      expect(service.validateBase64Image('data:image/gif;base64,AAAA')).toBe(
        false,
      );
    });
  });

  describe('dataURItoBlob', () => {
    it('should convert a valid base64 data URI to a Blob', () => {
      // "Hello"
      const base64 = 'SGVsbG8=';
      const dataURI = `data:text/plain;base64,${base64}`;

      const blob = service.dataURItoBlob(dataURI);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBeGreaterThan(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should throw and log when base64 is invalid (Base64.isValid false branch)', () => {
      const isValidSpy = jest.spyOn(Base64, 'isValid').mockReturnValue(false);

      expect(() =>
        service.dataURItoBlob('data:text/plain;base64,%%%NOT_BASE64%%%'),
      ).toThrow('Invalid base64 string');

      expect(consoleErrorSpy).toHaveBeenCalled();
      isValidSpy.mockRestore();
    });

    it('should throw and log when decoding fails (catch branch)', () => {
      const isValidSpy = jest.spyOn(Base64, 'isValid').mockReturnValue(true);
      const atobSpy = jest.spyOn(Base64, 'atob').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() =>
        service.dataURItoBlob('data:text/plain;base64,SGVsbG8='),
      ).toThrow('Invalid base64 string');

      expect(consoleErrorSpy).toHaveBeenCalled();

      atobSpy.mockRestore();
      isValidSpy.mockRestore();
    });

    it('should clean base64 string with invalid characters before converting', () => {
      // Valid 1x1 png base64, with newline + space appended to force cleaning.
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\n ';
      const dataURI = `data:image/png;base64,${base64}`;

      const blob = service.dataURItoBlob(dataURI);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should cover the "codePointAt(i) ?? 0" fallback (line 31)', () => {
      // Force codePointAt to return undefined so the "?? 0" path is executed.
      const cpSpy = jest
        .spyOn(String.prototype, 'codePointAt')
        .mockReturnValue(undefined as unknown as number);

      const base64 = 'SGVsbG8='; // "Hello"
      const dataURI = `data:text/plain;base64,${base64}`;

      const blob = service.dataURItoBlob(dataURI);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBeGreaterThan(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      cpSpy.mockRestore();
    });
  });

  describe('private cleanBase64String', () => {
    it('should strip invalid base64 characters', () => {
      const cleaned = (
        service as unknown as { cleanBase64String: (value: string) => string }
      ).cleanBase64String('ab+c/= \n\t$£%');
      expect(cleaned).toBe('ab+c/=');
    });
  });
});
