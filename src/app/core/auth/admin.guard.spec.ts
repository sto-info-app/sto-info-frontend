import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authServiceSpy: jest.Mocked<
    Pick<AuthService, 'isTokenValid' | 'isAdmin'>
  >;
  let routerSpy: jest.Mocked<Pick<Router, 'navigate'>>;

  const state = { url: '/admin' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = {
      isTokenValid: jest.fn(),
      isAdmin: jest.fn(),
    };
    routerSpy = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
    guard = TestBed.inject(AdminGuard);
  });

  it('redirects to login when not authenticated', () => {
    authServiceSpy.isTokenValid.mockReturnValue(false);

    expect(guard.canActivate({} as never, state)).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' },
    });
  });

  it('redirects home when authenticated but not an admin', () => {
    authServiceSpy.isTokenValid.mockReturnValue(true);
    authServiceSpy.isAdmin.mockReturnValue(false);

    expect(guard.canActivate({} as never, state)).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('allows access for an authenticated admin', () => {
    authServiceSpy.isTokenValid.mockReturnValue(true);
    authServiceSpy.isAdmin.mockReturnValue(true);

    expect(guard.canActivate({} as never, state)).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
