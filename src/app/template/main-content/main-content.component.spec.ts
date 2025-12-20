import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

import { MainContentComponent } from './main-content.component';

describe('MainContentComponent', () => {
  let component: MainContentComponent;
  let fixture: ComponentFixture<MainContentComponent>;

  let mockRoutingService: { getLink: jest.Mock<string, [string]> };
  let mockGeneralThemeService: {
    createDynamicSideColumnText: jest.Mock<string, []>;
  };

  beforeEach(() => {
    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-link'),
    };

    mockGeneralThemeService = {
      createDynamicSideColumnText: jest
        .fn()
        .mockReturnValue('random-theme-text'),
    };

    TestBed.configureTestingModule({
      imports: [MainContentComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map(), data: {} },
            queryParams: of({}),
          },
        },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: GeneralThemeService, useValue: mockGeneralThemeService },
      ],
    });

    fixture = TestBed.createComponent(MainContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialise theme panel text from the theme service', () => {
    expect(component).toBeTruthy();
    expect(
      mockGeneralThemeService.createDynamicSideColumnText,
    ).toHaveBeenCalled();
    expect(component.themePanel6RandomText).toBe('random-theme-text');
  });

  it('should expose app title, version and routes from environment and constants', () => {
    expect(component.appTitle).toBe(environment.appTitle);
    expect(component.appVersion).toBe(environment.version);
    expect(component.appRoutes).toBe(APP_ROUTES);
  });

  it('should return a route link using the routing service', () => {
    mockRoutingService.getLink.mockReturnValue('/expected/link');

    const result = component.getRouteLink('dashboard');

    expect(mockRoutingService.getLink).toHaveBeenCalledWith('dashboard');
    expect(result).toBe('/expected/link');
  });
});
