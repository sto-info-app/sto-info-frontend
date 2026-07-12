import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let service: CookieService;
  let mockDocument: Partial<Document>;
  let cookieStore: string;

  beforeEach(() => {
    cookieStore = '';
    mockDocument = {
      get cookie() {
        return cookieStore;
      },
      set cookie(val: string) {
        cookieStore = val;
      },
    };

    TestBed.configureTestingModule({
      providers: [CookieService, { provide: DOCUMENT, useValue: mockDocument }],
    });
    service = TestBed.inject(CookieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Cookie Status Management', () => {
    it('should have initial status false', () => {
      expect(service.getCookieStatus()).toBe(false);
    });

    it('should set and get cookie status', () => {
      service.setCookieStatus(true);
      expect(service.getCookieStatus()).toBe(true);

      service.setCookieStatus(false);
      expect(service.getCookieStatus()).toBe(false);
    });

    it('should emit cookie status changes', done => {
      service.setCookieStatus(true);
      service.cookieStatus$.subscribe(status => {
        expect(status).toBe(true);
        done();
      });
    });
  });

  describe('User Accepted Categories', () => {
    it('should return false for unaccepted category', () => {
      expect(service.isCookieCategoryAccepted('analytics')).toBe(false);
    });

    it('should return true for accepted category', () => {
      service.setUserAcceptedCookieCategories(['analytics', 'marketing']);
      expect(service.isCookieCategoryAccepted('analytics')).toBe(true);
      expect(service.isCookieCategoryAccepted('marketing')).toBe(true);
      expect(service.isCookieCategoryAccepted('functional')).toBe(false);
    });
  });

  describe('Document Cookie Operations', () => {
    // JSDOM supports document.cookie but sometimes it's flakey if not configured.
    // We will try standard access.

    it('should create a cookie with secure and samesite attributes', () => {
      const cookieSpy = jest.spyOn(mockDocument, 'cookie', 'set');
      service.createCookie('test_cookie', 'test_value', 1);
      expect(cookieSpy).toHaveBeenCalledWith(
        expect.stringContaining('test_cookie=test_value'),
      );
      expect(cookieSpy).toHaveBeenCalledWith(
        expect.stringContaining('SameSite=Lax'),
      );
      expect(cookieSpy).toHaveBeenCalledWith(expect.stringContaining('Secure'));
      cookieSpy.mockRestore();
    });

    it('should read a cookie', () => {
      mockDocument.cookie = 'read_me=read_value';
      const value = service.readCookie('read_me');
      expect(value).toBe('read_value');
    });

    it('should return null if cookie not found', () => {
      mockDocument.cookie = 'other=value';
      const value = service.readCookie('missing');
      expect(value).toBeNull();
    });

    it('should delete a cookie with secure and samesite attributes', () => {
      const cookieSpy = jest.spyOn(mockDocument, 'cookie', 'set');
      service.deleteTestCookie('delete_me');

      expect(cookieSpy).toHaveBeenCalledWith(
        expect.stringContaining('delete_me='),
      );
      expect(cookieSpy).toHaveBeenCalledWith(
        expect.stringContaining('SameSite=Lax'),
      );
      expect(cookieSpy).toHaveBeenCalledWith(expect.stringContaining('Secure'));
      cookieSpy.mockRestore();
    });
  });

  describe('Get Specific Cookie Status', () => {
    it('should update status to true if cookie value is true', () => {
      mockDocument.cookie = 'my_status=true';
      service.getSpecificCookieStatus('my_status');
      expect(service.getCookieStatus()).toBe(true);
    });

    it('should update status to false if cookie value is false', () => {
      service.setCookieStatus(true);
      mockDocument.cookie = 'my_status=false';
      service.getSpecificCookieStatus('my_status');
      expect(service.getCookieStatus()).toBe(false);
    });

    it('should default to false if cookie not found', () => {
      service.setCookieStatus(true);
      // clear cookies
      mockDocument.cookie = '';

      service.getSpecificCookieStatus('missing_status');
      expect(service.getCookieStatus()).toBe(false);
    });

    it('should not update status if it has not changed', () => {
      service.setCookieStatus(true);
      const nextSpy = jest.spyOn(
        (
          service as unknown as {
            _cookieStatusSubject: BehaviorSubject<boolean>;
          }
        )._cookieStatusSubject,
        'next',
      );
      mockDocument.cookie = 'my_status=true';
      service.getSpecificCookieStatus('my_status');
      // next should not be called because status is already true
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should read the correct cookie when multiple exist', () => {
      mockDocument.cookie = 'a=1; b=2; c=3';
      expect(service.readCookie('b')).toBe('2');
      expect(service.readCookie('a')).toBe('1');
      expect(service.readCookie('c')).toBe('3');
    });

    it('should decode cookie value', () => {
      mockDocument.cookie = 'enc=' + encodeURIComponent('val with spaces');
      expect(service.readCookie('enc')).toBe('val with spaces');
    });
  });
});
