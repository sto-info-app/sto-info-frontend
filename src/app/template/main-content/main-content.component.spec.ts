import { HttpResponse } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
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

  let httpTestingController: HttpTestingController;

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
        provideHttpClientTesting(),
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

    httpTestingController = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(MainContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpTestingController.expectOne(
      `${environment.apiUrl}/version`,
    );
    expect(req.request.method).toBe('GET');
    req.flush('backend-version', { status: 200, statusText: 'OK' });
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create and initialise theme panel text from the theme service', () => {
    expect(component).toBeTruthy();
    expect(
      mockGeneralThemeService.createDynamicSideColumnText,
    ).toHaveBeenCalled();
    expect(component.themePanel6RandomText).toBe('random-theme-text');
  });

  it('should expose app title, versions and routes from environment and constants', () => {
    expect(component.appTitle).toBe(environment.appTitle);
    expect(component.frontendAppVersion).toBe(environment.version || '');
    expect(component.appRoutes).toBe(APP_ROUTES);
  });

  it('should fall back to empty frontend version when environment.version is falsy', () => {
    const originalVersion: string = environment.version;
    environment.version = '';

    const localFixture: ComponentFixture<MainContentComponent> =
      TestBed.createComponent(MainContentComponent);
    const localComponent: MainContentComponent = localFixture.componentInstance;

    localFixture.detectChanges();

    try {
      const req = httpTestingController.expectOne(
        `${environment.apiUrl}/version`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('ignored-version', { status: 200, statusText: 'OK' });

      expect(localComponent.frontendAppVersion).toBe('');
    } finally {
      environment.version = originalVersion;
    }
  });

  it('should fetch and expose the backend app version from the API', () => {
    expect(component.backendAppVersion).toBe('backend-version');
  });

  it('should not update backend version when response status is not 200', () => {
    type MainContentWithTestApi = {
      // Access private method for targeted branch testing
      updateBackendVersion(response: HttpResponse<string>): void;
    };

    const componentWithApi = component as unknown as MainContentWithTestApi;

    component.backendAppVersion = '';

    const response: HttpResponse<string> = new HttpResponse<string>({
      status: 500,
      body: 'ignored',
    });

    componentWithApi.updateBackendVersion(response);

    expect(component.backendAppVersion).toBe('');
  });

  it('should not update backend version when response body is not a string', () => {
    type MainContentWithTestApi = {
      updateBackendVersion(response: HttpResponse<string>): void;
    };

    const componentWithApi = component as unknown as MainContentWithTestApi;

    component.backendAppVersion = '';

    const nonStringBody: unknown = undefined;
    const response: HttpResponse<string> = new HttpResponse<string>({
      status: 200,
      body: nonStringBody as string,
    });

    componentWithApi.updateBackendVersion(response);

    expect(component.backendAppVersion).toBe('');
  });

  it('should return a route link using the routing service', () => {
    mockRoutingService.getLink.mockReturnValue('/expected/link');

    const result = component.getRouteLink('dashboard');

    expect(mockRoutingService.getLink).toHaveBeenCalledWith('dashboard');
    expect(result).toBe('/expected/link');
  });
});
