import { Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HealthService } from 'src/app/core/health/health.service';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { ServiceInterruptionComponent } from './service-interruption.component';

describe('ServiceInterruptionComponent', () => {
  let component: ServiceInterruptionComponent;
  let fixture: ComponentFixture<ServiceInterruptionComponent>;
  let mockAlertThemeService: jest.Mocked<AlertThemeService>;
  let mockRenderer: jest.Mocked<Renderer2>;

  beforeEach(async () => {
    mockAlertThemeService = {
      clearAlertStylesheet: jest.fn(),
      clearTimers: jest.fn(),
    } as unknown as jest.Mocked<AlertThemeService>;

    mockRenderer = {} as unknown as jest.Mocked<Renderer2>;

    await TestBed.configureTestingModule({
      imports: [ServiceInterruptionComponent],
      providers: [
        { provide: AlertThemeService, useValue: mockAlertThemeService },
        { provide: HealthService, useValue: { state$: of('UP') } },
        { provide: Renderer2, useValue: mockRenderer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInterruptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should cleanup on destroy', () => {
    component.ngOnDestroy();
    expect(mockAlertThemeService.clearAlertStylesheet).toHaveBeenCalled();
    expect(mockAlertThemeService.clearTimers).toHaveBeenCalled();
  });
});
