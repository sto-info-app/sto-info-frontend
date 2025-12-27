import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { HealthService } from '../../../core/health/health.service';
import { ServiceInterruptionContentComponent } from './service-interruption-content.component';

describe('ServiceInterruptionContentComponent', () => {
  let component: ServiceInterruptionContentComponent;
  let fixture: ComponentFixture<ServiceInterruptionContentComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInterruptionContentComponent],
      providers: [
        {
          provide: AlertThemeService,
          useValue: {
            applyAlertThemeThenApplyStaticTheme: jest.fn(),
            clearAlertStylesheet: jest.fn(),
            clearTimers: jest.fn(),
          },
        },
        {
          provide: HealthService,
          useValue: {
            state$: of(''),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInterruptionContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
