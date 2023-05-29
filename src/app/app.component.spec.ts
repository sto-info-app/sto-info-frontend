import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [
        AuthService,
        { provide: 'API_URL', useValue: environment.apiUrl },
        MockProvider(MatDialog),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
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
