import {
  decodeStoHandle,
  encodeStoHandle,
  slugifyCharacterName,
} from './sto-handle.utils';

describe('STO Handle Utils', () => {
  describe('encodeStoHandle', () => {
    it('should return empty string if handle is null/undefined/empty', () => {
      expect(encodeStoHandle('')).toBe('');
      expect(encodeStoHandle(null as unknown as string)).toBe('');
      expect(encodeStoHandle(undefined as unknown as string)).toBe('');
    });

    it('should replace # with ~', () => {
      expect(encodeStoHandle('User#1234')).toBe('User~1234');
    });

    it('should return handle as is if no #', () => {
      expect(encodeStoHandle('User')).toBe('User');
    });
  });

  describe('decodeStoHandle', () => {
    it('should return empty string if handle is null/undefined/empty', () => {
      expect(decodeStoHandle('')).toBe('');
      expect(decodeStoHandle(null as unknown as string)).toBe('');
      expect(decodeStoHandle(undefined as unknown as string)).toBe('');
    });

    it('should replace ~ with #', () => {
      expect(decodeStoHandle('User~1234')).toBe('User#1234');
    });

    it('should return handle as is if no ~', () => {
      expect(decodeStoHandle('User')).toBe('User');
    });
  });

  describe('slugifyCharacterName', () => {
    it('should return empty string if name is null/undefined/empty', () => {
      expect(slugifyCharacterName('')).toBe('');
      expect(slugifyCharacterName(null as unknown as string)).toBe('');
      expect(slugifyCharacterName(undefined as unknown as string)).toBe('');
    });

    it('should lower case and trim', () => {
      expect(slugifyCharacterName('  Name  ')).toBe('name');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugifyCharacterName('My Character Name')).toBe(
        'my-character-name',
      );
    });

    it('should remove special characters', () => {
      expect(slugifyCharacterName('Name!@#$%^&*()_+')).toBe('name_');
    });

    it('should keep dots and hyphens', () => {
      expect(slugifyCharacterName('Name.With-Hyphen')).toBe('name.with-hyphen');
    });

    it('should collapse multiple spaces', () => {
      expect(slugifyCharacterName('Name   Space')).toBe('name-space');
    });
  });
});
