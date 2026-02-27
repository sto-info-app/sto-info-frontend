import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginResponse } from 'src/app/models/user-auth.models';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceSpy: jest.Mocked<AuthService>;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(() => {
    const authSpy = {
      isTokenValid: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      refreshToken: jest.fn(),
    };

    const routerMock = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerMock },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    authServiceSpy = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    routerSpy = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if token is valid and not expiring', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(true);
    authServiceSpy.isTokenExpiringSoon.mockReturnValue(false);

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/dashboard' } as RouterStateSnapshot,
    );

    expect(result).toBe(true);
    expect(authServiceSpy.refreshToken).not.toHaveBeenCalled();
  });

  it('should redirect to login if token is invalid', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(false);

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/dashboard' } as RouterStateSnapshot,
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('should attempt refresh if token is expiring', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(true);
    authServiceSpy.isTokenExpiringSoon.mockReturnValue(true);

    // Mock successful refresh
    const mockResponse: LoginResponse = {
      access_token: 'new',
      refresh_token: 'new',
      expires_in: 3600,
      user_id: '1',
    };
    authServiceSpy.refreshToken.mockReturnValue(of(mockResponse));

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/dashboard' } as RouterStateSnapshot,
    );

    expect(result).toBe(true);
    expect(authServiceSpy.refreshToken).toHaveBeenCalled();
  });

  it('should redirect to login if refresh fails', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(true);
    authServiceSpy.isTokenExpiringSoon.mockReturnValue(true);

    // Mock failed refresh
    authServiceSpy.refreshToken.mockReturnValue(
      throwError(() => new Error('Refresh failed')),
    );

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/dashboard' } as RouterStateSnapshot,
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('should pass returnUrl when state url is empty (root)', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(false);

    await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '' } as RouterStateSnapshot,
    );

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '' },
    });
  });

  it('should pass returnUrl including query params when present', async () => {
    authServiceSpy.isTokenValid.mockReturnValue(false);

    await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      {
        url: '/dashboard/accounts?tab=characters',
      } as RouterStateSnapshot,
    );

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard/accounts?tab=characters' },
    });
  });
});
