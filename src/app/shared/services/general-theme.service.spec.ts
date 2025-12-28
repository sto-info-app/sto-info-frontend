import { TestBed } from '@angular/core/testing';
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
      expect(val.length).toBeLessThanOrEqual(max);
    });

    it('should contain expected characters', () => {
      const val = service.generateRandomValue(10, 10);
      // Alphanumeric + space/hyphen possibly
      expect(val).toMatch(/^[A-Z0-9 -]+$/);
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
