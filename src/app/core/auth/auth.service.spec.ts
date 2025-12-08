import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.removeItem('access_token');
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding.
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return true from isAuthenticated$ when there is a token', () => {
    authService.saveToken(
      'valid-token',
      'valid-refresh-token',
      Date.now() + 3600,
    );
    authService.isAuthenticated$.subscribe(isAuthenticated => {
      expect(isAuthenticated).toBe(true);
    });
  });

  it('should return false from isAuthenticated$ when there is no token', () => {
    authService.removeToken();
    authService.isAuthenticated$.subscribe(isAuthenticated => {
      expect(isAuthenticated).toBe(false);
    });
  });

  it('should save tokens correctly', () => {
    service.saveToken('test-token', 'test-refresh-token', Date.now() + 3600);
    expect(localStorage.getItem('access_token')).toBe('test-token');
    expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token');
    service.isAuthenticated$.subscribe(authenticated => {
      expect(authenticated).toBeTruthy();
    });
  });

  it('should remove token correctly', () => {
    localStorage.setItem('access_token', 'test-token');
    service.removeToken();
    expect(localStorage.getItem('access_token')).toBeNull();
    service.isAuthenticated$.subscribe(authenticated => {
      expect(authenticated).toBeFalsy();
    });
  });

  it('should return true from isLoggedIn when there is a token', () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('expires_at', '1687002446481507');
    expect(authService.isLoggedIn()).toBe(true);
  });

  it('should return false from isLoggedIn when there is no token', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('expires_at');
    expect(authService.isLoggedIn()).toBe(false);
  });

  //NOTE: Add more tests for other methods like login, register, logout, etc. - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components
});
