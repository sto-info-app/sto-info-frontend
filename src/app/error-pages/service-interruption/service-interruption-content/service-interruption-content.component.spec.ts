import { Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import {
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { HealthService } from '../../../core/health/health.service';
import { ServiceInterruptionContentComponent } from './service-interruption-content.component';

describe('ServiceInterruptionContentComponent', () => {
  let component: ServiceInterruptionContentComponent;
  let fixture: ComponentFixture<ServiceInterruptionContentComponent>;
  let mockAlertThemeService: jest.Mocked<AlertThemeService>;
  let mockHealthService: { state$: BehaviorSubject<string> };
  let mockRenderer: jest.Mocked<Renderer2>;

  interface ComponentInternals {
    applyAlertStylesheet(color?: string): void;
    subs: { unsubscribe: () => void };
  }

  beforeEach(async () => {
    mockAlertThemeService = {
      applyAlertThemeThenApplyStaticTheme: jest.fn(),
      clearAlertStylesheet: jest.fn(),
      clearTimers: jest.fn(),
    } as unknown as jest.Mocked<AlertThemeService>;

    mockHealthService = {
      state$: new BehaviorSubject<string>(''),
    };

    mockRenderer = {} as unknown as jest.Mocked<Renderer2>;

    await TestBed.configureTestingModule({
      imports: [ServiceInterruptionContentComponent],
      providers: [
        { provide: AlertThemeService, useValue: mockAlertThemeService },
        { provide: HealthService, useValue: mockHealthService },
        { provide: Renderer2, useValue: mockRenderer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInterruptionContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Health State Handling', () => {
    it('should handle API_HEALTH_STATE_UP', () => {
      mockHealthService.state$.next(API_HEALTH_STATE_UP);
      fixture.detectChanges();

      expect(component.errorCode).toBe(200);
      expect(component.errorTitle).toBe('All Systems Operational');
      expect(component.errorDescription).toContain(
        'sensors indicated a temporary failure',
      );
      expect(component.alertState).toBe('green');
      expect(component.alertTitle).toBe('All Clear');
    });

    it('should handle API_HEALTH_STATE_DOWN', () => {
      mockHealthService.state$.next(API_HEALTH_STATE_DOWN);
      fixture.detectChanges();

      expect(component.errorCode).toBe(503);
      expect(component.errorTitle).toBe('Service Unavailable');
      expect(component.errorDescription).toContain(
        'unable to establish a reliable connection',
      );
      expect(component.alertState).toBe('grey');
    });

    it('should handle API_HEALTH_STATE_UNKNOWN', () => {
      mockHealthService.state$.next(API_HEALTH_STATE_UNKNOWN);
      fixture.detectChanges();

      expect(component.errorCode).toBe(503);
      expect(component.errorDescription).toContain(
        'unexpected systems failure',
      );
      expect(component.alertState).toBe('grey');
    });

    it('should handle other unexpected states', () => {
      mockHealthService.state$.next('WEIRD_STATE');
      fixture.detectChanges();

      expect(component.errorCode).toBe(503);
      expect(component.errorDescription).toContain('underway');
      expect(component.alertState).toBe('grey');
    });

    it('should apply alert stylesheet on state change', () => {
      mockHealthService.state$.next(API_HEALTH_STATE_DOWN);
      fixture.detectChanges();

      expect(
        mockAlertThemeService.applyAlertThemeThenApplyStaticTheme,
      ).toHaveBeenCalledWith(
        expect.any(Object), // renderer
        expect.any(Object), // el.nativeElement
        'grey',
      );
    });

    it('should use default yellow color in applyAlertStylesheet if none provided', () => {
      (component as unknown as ComponentInternals).applyAlertStylesheet();
      expect(
        mockAlertThemeService.applyAlertThemeThenApplyStaticTheme,
      ).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), 'yellow');
    });
  });

  it('should cleanup on destroy', () => {
    fixture.detectChanges();
    const unsubscribeSpy = jest.spyOn(
      (component as unknown as ComponentInternals).subs,
      'unsubscribe',
    );

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
    expect(mockAlertThemeService.clearAlertStylesheet).toHaveBeenCalled();
    expect(mockAlertThemeService.clearTimers).toHaveBeenCalled();
  });

  it('should format alert subtitle correctly', () => {
    mockHealthService.state$.next(API_HEALTH_STATE_UP);
    fixture.detectChanges();
    expect(component.alertSubtitle).toBe('Condition: Green');

    mockHealthService.state$.next(API_HEALTH_STATE_DOWN);
    fixture.detectChanges();
    expect(component.alertSubtitle).toBe('Condition: Grey');
  });
});
