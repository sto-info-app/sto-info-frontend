import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HealthService } from 'src/app/core/health/health.service';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { ServiceInterruptionComponent } from './service-interruption.component';

describe('ServiceInterruptionComponent', () => {
  let component: ServiceInterruptionComponent;
  let fixture: ComponentFixture<ServiceInterruptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInterruptionComponent],
      teardown: { destroyAfterEach: false },
      providers: [
        {
          provide: AlertThemeService,
          useValue: {
            applyAlertThemeThenApplyStaticTheme: jest.fn(),
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

    fixture = TestBed.createComponent(ServiceInterruptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
