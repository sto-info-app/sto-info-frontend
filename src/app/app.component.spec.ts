import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { of } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let authService: AuthService;
  let titleService: Title;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        Title,
        { provide: 'API_URL', useValue: environment.apiUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    titleService = TestBed.inject(Title);
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should check if user is logged in', () => {
    authService.isAuthenticated$ = of(true);
    component.ngOnInit();
    expect(component.isLoggedIn).toBe(true);
  });

  it('should logout', () => {
    spyOn(authService, 'performLogout');
    component.logout();
    expect(authService.performLogout).toHaveBeenCalled();
  });
});
