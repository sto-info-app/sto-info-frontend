import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(() => {
    const authServiceMock: Partial<jest.Mocked<AuthService>> = {
      isTokenValid: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    });
    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  //NOTE: Check this test! - https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  it('should allow navigation if user is authenticated', async () => {
    authService.isTokenValid.mockReturnValue(true);
    authService.isTokenExpiringSoon.mockReturnValue(false);

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/cookies' } as RouterStateSnapshot,
    );
    expect(result).toBe(true);
  });

  //NOTE: Check this test! - https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  it('should not allow navigation if user is not authenticated', async () => {
    authService.isTokenValid.mockReturnValue(false);
    authService.isTokenExpiringSoon.mockReturnValue(false);
    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/cookies' } as RouterStateSnapshot,
    );
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], expect.any(Object));
  });
});
