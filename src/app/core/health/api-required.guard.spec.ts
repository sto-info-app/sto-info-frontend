import { TestBed } from '@angular/core/testing';
// Wait, file content showed 'export class ApiRequiredGuard'
// But test showed 'import { apiRequiredGuard }'.
// Let me double check file content in Step 312.
// It is 'export class ApiRequiredGuard'.
// The existing spec imported 'apiRequiredGuard' which suggests a function or misnamed import.
// I will import the Class and use it as a guard class or functional guard wrapper?
// The file defines a CLASS 'ApiRequiredGuard' implements 'CanActivate'.
// So it is a Class-based guard.
// The existing spec 'api-required.guard.spec.ts' used 'apiRequiredGuard' function?
// Maybe the user's codebase has a functional export too? No, I saw the full file.
// It only had 'export class ApiRequiredGuard'.
// So existing spec is BROKEN/invalid if it imports 'apiRequiredGuard' function unless I missed something?
// Ah, maybe the FILE NAME is 'api-required.guard.ts' but the export is Class.
// Recent Angular versions prefer functional guards.
// But this is Class-based.
// So I should test it as an INJECTABLE service.

import { of, throwError } from 'rxjs';
import {
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { ApiRequiredGuard } from './api-required.guard';
import { HealthService } from './health.service';

describe('ApiRequiredGuard', () => {
  let guard: ApiRequiredGuard;
  let healthServiceSpy: jest.Mocked<HealthService>;

  beforeEach(() => {
    const spy = {
      checkOnce: jest.fn(),
      recordFailure: jest.fn(),
      recordSuccess: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [ApiRequiredGuard, { provide: HealthService, useValue: spy }],
    });

    guard = TestBed.inject(ApiRequiredGuard);
    healthServiceSpy = TestBed.inject(
      HealthService,
    ) as jest.Mocked<HealthService>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should record a failure if checkOnce returns DOWN', done => {
    healthServiceSpy.checkOnce.mockReturnValue(of(API_HEALTH_STATE_DOWN));

    guard.canActivate().subscribe(result => {
      expect(result).toBe(true);
      expect(healthServiceSpy.recordFailure).toHaveBeenCalled();
      expect(healthServiceSpy.recordSuccess).not.toHaveBeenCalled();
      done();
    });
  });

  it('should record a success if checkOnce returns UP', done => {
    healthServiceSpy.checkOnce.mockReturnValue(of(API_HEALTH_STATE_UP));

    guard.canActivate().subscribe(result => {
      expect(result).toBe(true);
      expect(healthServiceSpy.recordSuccess).toHaveBeenCalled();
      expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
      done();
    });
  });

  it('should error and not allow navigation when checkOnce fails', done => {
    healthServiceSpy.checkOnce.mockReturnValue(
      throwError(() => new Error('Health check failed')),
    );

    guard.canActivate().subscribe({
      next: () => {
        done.fail('Guard should not emit when health check errors');
      },
      error: () => {
        expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
        expect(healthServiceSpy.recordSuccess).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
