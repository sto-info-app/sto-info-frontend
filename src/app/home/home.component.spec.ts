import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faHandSpock } from '@fortawesome/free-solid-svg-icons';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { RoutingService } from '../shared/services/routing.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let routingService: jest.Mocked<RoutingService>;

  beforeEach(async () => {
    const authServiceMock: Partial<jest.Mocked<AuthService>> = {
      isAuthenticated$: of(true),
    };
    const routingServiceMock: jest.Mocked<RoutingService> = {
      getLink: jest.fn(),
    } as unknown as jest.Mocked<RoutingService>;

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: RoutingService, useValue: routingServiceMock },
        FaIconLibrary,
      ],
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faHandSpock);

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    routingService = TestBed.inject(
      RoutingService,
    ) as jest.Mocked<RoutingService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the correct app title', () => {
    expect(component.appTitle).toEqual(environment.appTitle);
  });

  it('should update isLoggedIn when auth state changes', () => {
    // isAuthenticated$ is already true from the spy's property
    expect(component.isLoggedIn).toBe(true);
  });

  it('should delegate route link generation to routing service', () => {
    routingService.getLink.mockReturnValue('/test-route');
    const link = component.getRouteLink('test');
    expect(routingService.getLink).toHaveBeenCalledWith('test');
    expect(link).toBe('/test-route');
  });
});
