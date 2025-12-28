import { Renderer2 } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AlertState } from '../constants/lcars-theme.constants';
import { AlertThemeService } from './alert-theme.service';

describe('AlertThemeService', () => {
  let service: AlertThemeService;
  let rendererSpy: jest.Mocked<Renderer2>;
  let elementSpy: Element;
  let headSpy: Element;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AlertThemeService],
    });
    service = TestBed.inject(AlertThemeService);

    // Strict Mocking for Renderer2
    rendererSpy = {
      createElement: jest.fn(),
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      // Add other methods if required by Renderer2 interface strictly, or cast
    } as unknown as jest.Mocked<Renderer2>;

    // Mock DOM elements
    // We can't easily mock DOM elements with full types, but we can structure them enough.
    headSpy = {
      querySelectorAll: jest.fn().mockReturnValue([]),
    } as unknown as Element;

    elementSpy = {
      ownerDocument: {
        head: headSpy,
      },
    } as unknown as Element;

    // basic mock return values
    rendererSpy.createElement.mockReturnValue(
      'mockLinkElement' as unknown as HTMLLinkElement,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Stylesheet Management', () => {
    it('should upsert animated stylesheet', () => {
      service.applyAlertTheme(rendererSpy, elementSpy as Element, 'red');

      expect(headSpy.querySelectorAll as jest.Mock).toHaveBeenCalled();
      expect(rendererSpy.createElement).toHaveBeenCalledWith('link');
      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        'mockLinkElement',
        'href',
        'assets/lcars/lcars-red-alert.css',
      );
      expect(rendererSpy.appendChild).toHaveBeenCalledWith(
        headSpy,
        'mockLinkElement',
      );
    });

    it('should upsert static stylesheet', () => {
      service.applyAlertStaticTheme(
        rendererSpy,
        elementSpy as Element,
        'green',
      );

      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        'mockLinkElement',
        'href',
        'assets/lcars/lcars-green-alert-static.css',
      );
    });

    it('should remove existing stylesheets if found', () => {
      const mockExistingLink = 'existingLink';
      (headSpy.querySelectorAll as jest.Mock).mockReturnValue([
        mockExistingLink,
      ]);

      service.clearAlertStylesheet(rendererSpy, elementSpy as Element);

      expect(rendererSpy.removeChild).toHaveBeenCalledWith(
        headSpy,
        mockExistingLink,
      );
    });
  });

  describe('Timers', () => {
    it('should clear theme after short time', fakeAsync(() => {
      // Ensure querySelectorAll returns something so removeChild is actually called
      (headSpy.querySelectorAll as jest.Mock).mockReturnValue(['mockLink']);

      service.applyAlertThemeThenClearAfterAShortTime(
        rendererSpy,
        elementSpy as Element,
        'red',
      );

      // Verify setup calls happened
      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        expect.anything(),
        'href',
        'assets/lcars/lcars-red-alert.css',
      );

      // Clear spy to verify the timer callback specifically
      rendererSpy.removeChild.mockClear();

      tick(10000); // Advance time

      expect(rendererSpy.removeChild).toHaveBeenCalled();
    }));

    it('should apply static theme after delay', fakeAsync(() => {
      service.applyAlertThemeThenApplyStaticTheme(
        rendererSpy,
        elementSpy as Element,
        'blue',
      );

      tick(10000); // Advance time

      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        expect.anything(),
        'href',
        'assets/lcars/lcars-blue-alert-static.css',
      );
    }));

    it('should clear all timers on destroy', () => {
      const clearSpy = jest.spyOn(service, 'clearTimers');
      service.ngOnDestroy();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle clearTimers without element', () => {
      service.clearTimers();
    });

    it('should use default red color in applyAlertThemeThenClearAfterAShortTime', () => {
      service.applyAlertThemeThenClearAfterAShortTime(rendererSpy, elementSpy);
      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        expect.anything(),
        'href',
        'assets/lcars/lcars-red-alert.css',
      );
    });

    it('should use default red color in applyAlertThemeThenApplyStaticTheme', () => {
      service.applyAlertThemeThenApplyStaticTheme(rendererSpy, elementSpy);
      expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
        expect.anything(),
        'href',
        'assets/lcars/lcars-red-alert.css',
      );
    });
  });

  describe('CSS URI Resolution', () => {
    const animatedCases = [
      { color: 'green', expected: 'assets/lcars/lcars-green-alert.css' },
      { color: 'yellow', expected: 'assets/lcars/lcars-yellow-alert.css' },
      { color: 'blue', expected: 'assets/lcars/lcars-blue-alert.css' },
      { color: 'grey', expected: 'assets/lcars/lcars-grey-alert.css' },
      { color: 'red', expected: 'assets/lcars/lcars-red-alert.css' },
      { color: 'unknown', expected: 'assets/lcars/lcars-red-alert.css' },
    ];

    test.each(animatedCases)(
      'should resolve animated URI for $color',
      ({ color, expected }) => {
        rendererSpy.setAttribute.mockClear();
        service.applyAlertTheme(rendererSpy, elementSpy, color as AlertState);
        expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
          expect.anything(),
          'href',
          expected,
        );
      },
    );

    const staticCases = [
      { color: 'green', expected: 'assets/lcars/lcars-green-alert-static.css' },
      {
        color: 'yellow',
        expected: 'assets/lcars/lcars-yellow-alert-static.css',
      },
      { color: 'blue', expected: 'assets/lcars/lcars-blue-alert-static.css' },
      { color: 'grey', expected: 'assets/lcars/lcars-grey-alert-static.css' },
      { color: 'red', expected: 'assets/lcars/lcars-red-alert-static.css' },
      { color: 'unknown', expected: 'assets/lcars/lcars-red-alert-static.css' },
    ];

    test.each(staticCases)(
      'should resolve static URI for $color',
      ({ color, expected }) => {
        rendererSpy.setAttribute.mockClear();
        service.applyAlertStaticTheme(
          rendererSpy,
          elementSpy,
          color as AlertState,
        );
        expect(rendererSpy.setAttribute).toHaveBeenCalledWith(
          expect.anything(),
          'href',
          expected,
        );
      },
    );
  });
});
