import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: AuthService;
  let router: Router;
  let routerSpy: jasmine.Spy;

  const routeMock: any = { snapshot: {} };
  const routeStateMock: any = { snapshot: {}, url: '/cookies' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthGuard, AuthService],
    });
    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    // Add a spy on the router navigation method
    routerSpy = spyOn(router, 'navigate');
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if user is authenticated', () => {
    spyOn(authService, 'getToken').and.returnValue('test-token');
    expect(guard.canActivate(routeMock, routeStateMock)).toBe(true);
    expect(routerSpy).not.toHaveBeenCalled();
  });

  it('should not allow navigation if user is not authenticated', () => {
    spyOn(authService, 'getToken').and.returnValue(null);
    expect(guard.canActivate(routeMock, routeStateMock)).toBe(false);
    expect(routerSpy).toHaveBeenCalledWith(['/login']);
  });
});
