import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = { isAuthenticated$: of(true) };

    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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
    component = new HomeComponent(mockAuthService);
    expect(component.isLoggedIn).toBeTrue();
  });
});
