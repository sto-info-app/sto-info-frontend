import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj<AuthService>('AuthService', [
            'isTokenValid',
            'isTokenExpiringSoon',
          ]),
        },
      ],
    });
    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  //NOTE: Check this test! - https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  it('should allow navigation if user is authenticated', async () => {
    authService.isTokenValid.and.returnValue(true);
    authService.isTokenExpiringSoon.and.returnValue(false);

    const result = await guard.canActivate(
      {} as any,
      { url: '/cookies' } as any,
    );
    expect(result).toBeTrue();
  });

  //NOTE: Check this test! - https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  it('should not allow navigation if user is not authenticated', async () => {
    authService.isTokenValid.and.returnValue(false);
    authService.isTokenExpiringSoon.and.returnValue(false);
    const navigateSpy = spyOn(router, 'navigate');

    const result = await guard.canActivate(
      {} as any,
      { url: '/cookies' } as any,
    );
    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
  });
});
