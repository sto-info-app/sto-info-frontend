import { FormControl } from '@angular/forms';

import {
  countCodepoints,
  EXACT_GAME_NAME_MAX_CODEPOINTS,
  inputCeilingFor,
  MAX_CODEPOINTS_ERROR,
  maxCodepointsValidator,
} from './fleet-name-length';

describe('fleet name length', () => {
  describe('countCodepoints', () => {
    it('counts an astral character once rather than twice', () => {
      expect('𝕬'.length).toBe(2);
      expect(countCodepoints('𝕬')).toBe(1);
    });
  });

  describe('inputCeilingFor', () => {
    // Clipping to the ceiling always leaves more than the budget, even when
    // every character is astral, so nothing is quietly shortened into a
    // name that passes.
    it('leaves room for one astral character more than the budget', () => {
      const clipped = '𝕬'.repeat(100).slice(0, inputCeilingFor(64));

      expect(countCodepoints(clipped)).toBe(65);
    });
  });

  describe('maxCodepointsValidator', () => {
    const validate = (value: unknown, trim = false) =>
      maxCodepointsValidator(
        EXACT_GAME_NAME_MAX_CODEPOINTS,
        trim,
      )(new FormControl(value));

    it('accepts a name exactly at the budget', () => {
      expect(validate('a'.repeat(64))).toBeNull();
    });

    it('refuses a name one over, saying by how much', () => {
      expect(validate('a'.repeat(65))).toEqual({
        [MAX_CODEPOINTS_ERROR]: { max: 64, actual: 65 },
      });
    });

    it('accepts astral characters the budget allows, whatever their width', () => {
      expect(validate('𝕬'.repeat(64))).toBeNull();
    });

    // The server stores an edge space and so counts it.
    it('counts spaces at either end unless told to trim', () => {
      const padded = ` ${'a'.repeat(63)} `;

      expect(validate(padded)).not.toBeNull();
      expect(validate(padded, true)).toBeNull();
    });

    it('leaves anything that is not text to the other validators', () => {
      expect(validate(null)).toBeNull();
    });
  });
});
