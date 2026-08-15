import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let authService: { isTokenValid: jest.Mock };
  let accessControlService: { hasPermission: jest.Mock };
  let router: { navigate: jest.Mock };

  const state = { url: '/storytime/manage' } as RouterStateSnapshot;

  /**
   * Builds a route snapshot carrying the supplied required permission.
   *
   * @param permission - The permission the route declares, if any.
   * @returns The route snapshot.
   */
  const routeWith = (permission?: string): ActivatedRouteSnapshot =>
    ({ data: permission ? { permission } : {} }) as ActivatedRouteSnapshot;

  beforeEach(() => {
    authService = { isTokenValid: jest.fn().mockReturnValue(true) };
    accessControlService = {
      hasPermission: jest.fn().mockReturnValue(of(true)),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        PermissionGuard,
        { provide: AuthService, useValue: authService },
        { provide: AccessControlService, useValue: accessControlService },
        { provide: Router, useValue: router },
      ],
    });

    guard = TestBed.inject(PermissionGuard);
  });

  it('is created', () => {
    expect(guard).toBeTruthy();
  });

  it('allows the route when the permission is held', async () => {
    const allowed = await firstValueFrom(
      guard.canActivate(routeWith(PERMISSIONS.STORYTIME_STORY_CREATE), state),
    );

    expect(allowed).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sends an authenticated user home when the permission is missing', async () => {
    accessControlService.hasPermission.mockReturnValue(of(false));

    const allowed = await firstValueFrom(
      guard.canActivate(routeWith(PERMISSIONS.STORYTIME_MODERATE), state),
    );

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('sends an unauthenticated user to login with a return URL', async () => {
    authService.isTokenValid.mockReturnValue(false);

    const allowed = await firstValueFrom(
      guard.canActivate(routeWith(PERMISSIONS.STORYTIME_STORY_CREATE), state),
    );

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/storytime/manage' },
    });
    expect(accessControlService.hasPermission).not.toHaveBeenCalled();
  });

  // A wiring mistake should not become an outage: the guard enforces what the
  // route asks for, and an unconfigured route asks for nothing.
  it('allows a route that declares no permission', async () => {
    const allowed = await firstValueFrom(guard.canActivate(routeWith(), state));

    expect(allowed).toBe(true);
    expect(accessControlService.hasPermission).not.toHaveBeenCalled();
  });
});
