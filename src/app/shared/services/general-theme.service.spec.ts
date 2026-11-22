import { TestBed } from '@angular/core/testing';

import * as random from 'src/app/shared/utils/random.utils';

import { GeneralThemeService } from './general-theme.service';

describe('GeneralThemeService', () => {
  let service: GeneralThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeneralThemeService],
    });
    service = TestBed.inject(GeneralThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('randomCharacter', () => {
    it('should return a character from A-Z', () => {
      const char = service.randomCharacter();
      expect(char).toMatch(/^[A-Z]$/);
    });
  });

  describe('generateRandomValue', () => {
    it('should generate value within length constraints', () => {
      const min = 5;
      const max = 10;
      const val = service.generateRandomValue(min, max);
      expect(val.length).toBeGreaterThanOrEqual(min);
      expect(val.length).toBeLessThanOrEqual(max + 1);
    });

    it('should contain expected characters', () => {
      const val = service.generateRandomValue(10, 10);
      // Alphanumeric + space/hyphen possibly
      expect(val).toMatch(/^[A-Z0-9 -]+$/);
    });

    describe('with the draws fixed', () => {
      beforeEach(() => {
        // Left in the order drawn, so each value is predictable.
        jest.spyOn(random, 'shuffled').mockImplementation(items => [...items]);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      /**
       * Makes `randomInt` answer with these, one to each draw, in order.
       *
       * @param values - The answers.
       * @returns The spy.
       */
      const drawing = (...values: number[]) => {
        const spy = jest.spyOn(random, 'randomInt');
        values.forEach(value => spy.mockReturnValueOnce(value));
        return spy;
      };

      // Length 4, one letter (A), three digits, then the 1 in 20 chance of a
      // hyphen after the first character.
      it('adds a hyphen when the 1 in 20 chance comes up', () => {
        const spy = drawing(1, 1, 0, 5, 6, 7, 0, 0, 1);

        expect(service.generateRandomValue(3, 6)).toBe('A-567');
        expect(spy).toHaveBeenCalledWith(20);
        expect(spy).toHaveBeenCalledWith(1);
      });

      it('adds nothing when the 1 in 20 chance does not come up', () => {
        drawing(1, 1, 0, 5, 6, 7, 1);

        expect(service.generateRandomValue(3, 6)).toBe('A567');
      });

      // The shortest a value can be is never long enough for a mark inside it.
      it('does not try for a mark in a value of the shortest length', () => {
        const spy = drawing(0, 0, 5, 6, 7);

        expect(service.generateRandomValue(3, 6)).toBe('567');
        expect(spy).not.toHaveBeenCalledWith(20);
      });
    });
  });

  describe('createDynamicDataCascade', () => {
    it('should generate HTML string with correct rows and columns', () => {
      service.dataCascadeRows = 2;
      service.dataCascadeCols = 2;

      const html = service.createDynamicDataCascade();

      expect(html).toContain('class="row-1"');
      expect(html).toContain('class="row-2"');
      expect(html).toContain('class="dc1"');
      expect(html).toContain('class="dc2"');
    });
  });

  describe('createDynamicSideColumnText', () => {
    it('should generate HTML for side column', () => {
      const html = service.createDynamicSideColumnText();
      expect(html).toContain('class="random-lcars-ref"');
      expect(html).toContain('class="hop"');
    });
  });
});
