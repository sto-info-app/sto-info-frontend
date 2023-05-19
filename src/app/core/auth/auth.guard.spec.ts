import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: AuthService;
  let router: Router;

  const routeMock: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
  const routeStateMock: RouterStateSnapshot = {
    url: '/cookies',
  } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthGuard, MockProvider(AuthService)],
    });
    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if user is authenticated', () => {
    spyOn(authService, 'getToken').and.returnValue('test-token');
    expect(guard.canActivate(routeMock, routeStateMock)).toBe(true);
  });

  it('should not allow navigation if user is not authenticated', () => {
    spyOn(authService, 'getToken').and.returnValue(null);
    const navigateSpy = spyOn(router, 'navigate');
    expect(guard.canActivate(routeMock, routeStateMock)).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
