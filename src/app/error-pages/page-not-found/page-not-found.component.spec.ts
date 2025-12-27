import { ElementRef } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME } from 'src/app/shared/constants/timings.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { PageNotFoundComponent } from './page-not-found.component';

describe('PageNotFoundComponent', () => {
  let component: PageNotFoundComponent;
  let fixture: ComponentFixture<PageNotFoundComponent>;
  let mockAlertThemeService: jest.Mocked<AlertThemeService>;
  let mockElementRef: ElementRef;

  beforeEach(async () => {
    const alertSpy = {
      applyAlertThemeThenApplyStaticTheme: jest.fn(),
      clearAlertStylesheet: jest.fn(),
      clearTimers: jest.fn(),
    } as unknown as jest.Mocked<AlertThemeService>;

    mockElementRef = new ElementRef({});

    await TestBed.configureTestingModule({
      imports: [PageNotFoundComponent],
      providers: [
        { provide: ElementRef, useValue: mockElementRef },
        { provide: AlertThemeService, useValue: alertSpy },
      ],
    }).compileComponents();

    mockAlertThemeService = TestBed.inject(
      AlertThemeService,
    ) as jest.Mocked<AlertThemeService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call applyAlertThemeThenApplyStaticTheme on init', fakeAsync(() => {
    const testFixture = TestBed.createComponent(PageNotFoundComponent);
    testFixture.detectChanges();
    tick(MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME);
    expect(
      mockAlertThemeService.applyAlertThemeThenApplyStaticTheme,
    ).toHaveBeenCalled();
  }));

  it('should call clearAlertStylesheet and clearTimers on destroy', () => {
    const testFixture = TestBed.createComponent(PageNotFoundComponent);
    const testComponent = testFixture.componentInstance;
    testComponent.ngOnDestroy();
    expect(mockAlertThemeService.clearAlertStylesheet).toHaveBeenCalled();
    expect(mockAlertThemeService.clearTimers).toHaveBeenCalled();
  });
});
