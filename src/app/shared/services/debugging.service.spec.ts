import { TestBed } from '@angular/core/testing';
import { DebuggingService } from './debugging.service';
// We mock module to control environment variables
import { environment } from 'src/environments/environment';

jest.mock('src/environments/environment', () => ({
  environment: {
    production: false,
    allowDebugging: false,
  },
}));

describe('DebuggingService', () => {
  let service: DebuggingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DebuggingService],
    });
    service = TestBed.inject(DebuggingService);
    // Reset mocks default
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).production = false;
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).allowDebugging = false;
    // Typescript might complain about assigning to read-only property if strictly typed.
    // In Jest module mocks, it's often a plain object.
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false if production is true', () => {
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).production = true;
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).allowDebugging = true; // Even if true, prod overrides?
    // Implementation:
    // if (environment.production) return false;

    expect(service.allowDebugging()).toBe(false);
  });

  it('should return allowDebugging value if production is false', () => {
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).production = false;
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).allowDebugging = true;
    expect(service.allowDebugging()).toBe(true);

    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).allowDebugging = false;
    expect(service.allowDebugging()).toBe(false);
  });

  it('should return false if allowDebugging is undefined', () => {
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).production = false;
    (
      environment as unknown as {
        production: boolean;
        allowDebugging: boolean | undefined;
      }
    ).allowDebugging = undefined;
    expect(service.allowDebugging()).toBe(false);
  });
});
