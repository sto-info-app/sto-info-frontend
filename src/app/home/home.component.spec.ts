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
  let routingService: jasmine.SpyObj<RoutingService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated$: of(true),
    });
    const routingServiceSpy = jasmine.createSpyObj('RoutingService', [
      'getLink',
    ]);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        FaIconLibrary,
      ],
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faHandSpock);

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    routingService = TestBed.inject(
      RoutingService,
    ) as jasmine.SpyObj<RoutingService>;
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
    expect(component.isLoggedIn).toBeTrue();
  });

  it('should delegate route link generation to routing service', () => {
    routingService.getLink.and.returnValue('/test-route');
    const link = component.getRouteLink('test');
    expect(routingService.getLink).toHaveBeenCalledWith('test');
    expect(link).toBe('/test-route');
  });
});
