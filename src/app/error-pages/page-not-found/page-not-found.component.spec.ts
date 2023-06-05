// import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { RedAlertThemeService } from 'src/app/shared/services/red-alert-theme.service';
import { PageNotFoundComponent } from './page-not-found.component';

describe('PageNotFoundComponent', () => {
  let component: PageNotFoundComponent;
  let fixture: ComponentFixture<PageNotFoundComponent>;
  // let mockRedAlertThemeService: jasmine.SpyObj<RedAlertThemeService>;
  // let mockElementRef: ElementRef;

  /*beforeEach(async () => {
    const redAlertSpy = jasmine.createSpyObj('RedAlertThemeService', [
      'applyRedAlertThemeThenApplyStaticRedTheme',
      'clearRedAlertStylesheet',
    ]);

    mockElementRef = new ElementRef({});

    await TestBed.configureTestingModule({
      declarations: [PageNotFoundComponent],
      providers: [
        { provide: ElementRef, useValue: mockElementRef },
        { provide: RedAlertThemeService, useValue: redAlertSpy },
      ],
    }).compileComponents();

    mockRedAlertThemeService = TestBed.inject(
      RedAlertThemeService,
    ) as jasmine.SpyObj<RedAlertThemeService>;
  });*/

  beforeEach(() => {
    fixture = TestBed.createComponent(PageNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //NOTE: Fix tests
  /*it('should call applyRedAlertThemeThenApplyStaticRedTheme on init', fakeAsync(() => {
    const testFixture = TestBed.createComponent(PageNotFoundComponent);
    const testComponent = testFixture.componentInstance;
    testComponent.ngOnInit();
    tick(MILLISECONDS_SWITCH_TO_RED_ALERT_STATIC_THEME);
    expect(
      mockRedAlertThemeService.applyRedAlertThemeThenApplyStaticRedTheme,
    ).toHaveBeenCalled();
  }));

  it('should call clearRedAlertStylesheet on destroy', () => {
    const testFixture = TestBed.createComponent(PageNotFoundComponent);
    const testComponent = testFixture.componentInstance;
    testComponent.ngOnDestroy();
    expect(mockRedAlertThemeService.clearRedAlertStylesheet).toHaveBeenCalled();
  });*/
});
