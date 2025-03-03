import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FaIconComponent,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { MockComponent } from 'ng-mocks';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { RoutingService } from '../shared/services/routing.service';
import { HomeComponent } from './home.component';

interface MockAuthService {
  isAuthenticated$: Observable<boolean>;
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockAuthService: MockAuthService;
  let routingService: RoutingService = new RoutingService();

  beforeEach(async () => {
    library.add(fas); // Add FontAwesome icons to the library
    mockAuthService = { isAuthenticated$: of(true) };
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FontAwesomeModule],
      declarations: [HomeComponent, MockComponent(FaIconComponent)],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the correct app title', () => {
    expect(component.appTitle).toEqual(environment.appTitle);
  });

  it('should subscribe to authentication state on creation', () => {
    component = new HomeComponent(
      mockAuthService as unknown as AuthService,
      routingService,
    );
    expect(component.isLoggedIn).toBeTrue();
  });
});
