import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  //TODO: Restore these variables - disabled as unused when tests below were disabled!
  //NOTE: https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  // let authService: AuthService;
  // let router: Router;

  // const routeMock: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
  // const routeStateMock: RouterStateSnapshot = {
  //   url: '/cookies',
  // } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthGuard,
        MockProvider(AuthService),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    guard = TestBed.inject(AuthGuard);
    //TODO: Restore these variables - disabled as unused when tests below were disabled!
    //NOTE: https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
    // authService = TestBed.inject(AuthService);
    // router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  //TODO: Restore this test!
  //NOTE: https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  // it('should allow navigation if user is authenticated', async () => {
  //   spyOn(authService, 'getToken').and.returnValue('test-token');
  //   const result = await guard.canActivate(routeMock, routeStateMock);
  //   expect(result).toBe(true);
  // });

  //TODO: Restore this test!
  //NOTE: https://app.shortcut.com/startrekonlineinfo/story/176/restore-and-fix-auth-guard-tests
  // it('should not allow navigation if user is not authenticated', async () => {
  //   spyOn(authService, 'getToken').and.returnValue(null);
  //   const navigateSpy = spyOn(router, 'navigate');
  //   const result = await guard.canActivate(routeMock, routeStateMock);
  //   expect(result).toBe(false);
  //   expect(navigateSpy).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
  // });
});
