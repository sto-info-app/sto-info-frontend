import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import {
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { ApiUpGuard } from './api-up.guard';
import { HealthService } from './health.service';

describe('ApiUpGuard', () => {
  let guard: ApiUpGuard;
  let healthServiceSpy: jest.Mocked<HealthService>;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(() => {
    const healthSpy = {
      snapshot: jest.fn(),
    };
    const rSpy = {
      parseUrl: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ApiUpGuard,
        { provide: HealthService, useValue: healthSpy },
        { provide: Router, useValue: rSpy },
      ],
    });

    guard = TestBed.inject(ApiUpGuard);
    healthServiceSpy = TestBed.inject(
      HealthService,
    ) as jest.Mocked<HealthService>;
    routerSpy = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if API is UP', () => {
    healthServiceSpy.snapshot.mockReturnValue(API_HEALTH_STATE_UP);
    const result = guard.canActivate();
    expect(result).toBe(true);
  });

  it('should allow navigation if API is UNKNOWN', () => {
    healthServiceSpy.snapshot.mockReturnValue(API_HEALTH_STATE_UNKNOWN);
    const result = guard.canActivate();
    expect(result).toBe(true);
  });

  it('should redirect to service-interruption if API is DOWN', () => {
    healthServiceSpy.snapshot.mockReturnValue(API_HEALTH_STATE_DOWN);
    const dummyUrlTree = {} as UrlTree;
    routerSpy.parseUrl.mockReturnValue(dummyUrlTree);

    const result = guard.canActivate();

    expect(result).toBe(dummyUrlTree);
    expect(routerSpy.parseUrl).toHaveBeenCalledWith('/service-interruption');
  });
});
