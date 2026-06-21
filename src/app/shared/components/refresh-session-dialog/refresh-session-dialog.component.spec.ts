import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { RefreshSessionDialogComponent } from './refresh-session-dialog.component';

describe('RefreshSessionDialogComponent', () => {
  let component: RefreshSessionDialogComponent;
  let fixture: ComponentFixture<RefreshSessionDialogComponent>;
  let mockDialogRef: jest.Mocked<MatDialogRef<RefreshSessionDialogComponent>>;
  let mockAppComponent: Partial<AppComponent>;
  let mockAuthService: {
    isAuthenticated$: Subject<boolean>;
    getSecondsUntilLoginSessionExpiry: jest.Mock<number, []>;
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<RefreshSessionDialogComponent>>;

    mockAppComponent = {
      logout: jest.fn(),
    };

    mockAuthService = {
      isAuthenticated$: new Subject<boolean>(),
      getSecondsUntilLoginSessionExpiry: jest
        .fn<number, []>()
        .mockReturnValue(300),
    };

    await TestBed.configureTestingModule({
      imports: [RefreshSessionDialogComponent, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { appComponent: mockAppComponent },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefreshSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close with true on stay connected', () => {
    component.onStayConnected();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call logout and close with false on logout', () => {
    component.onLogout();
    expect(mockAppComponent.logout).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should handle missing appComponent in data', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RefreshSessionDialogComponent, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(RefreshSessionDialogComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.appComponent).toBeNull();
    newComponent.onLogout();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should handle data object without appComponent', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RefreshSessionDialogComponent, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(RefreshSessionDialogComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.appComponent).toBeNull();
  });

  it('should close on logout announced by AuthService', () => {
    mockAuthService.isAuthenticated$.next(false);
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should refresh the countdown and rendered time every second', () => {
    jest.useFakeTimers();
    try {
      mockAuthService.getSecondsUntilLoginSessionExpiry
        .mockReturnValueOnce(300)
        .mockReturnValueOnce(299)
        .mockReturnValueOnce(298);

      const localFixture = TestBed.createComponent(
        RefreshSessionDialogComponent,
      );
      localFixture.detectChanges(); // runs ngOnInit -> startCountdown

      const text = () =>
        (
          localFixture.nativeElement.querySelector('.countdown-message')
            ?.textContent ?? ''
        )
          .replace(/\s+/g, ' ')
          .trim();

      expect(text()).toContain('05:00');

      jest.advanceTimersByTime(1000);
      expect(localFixture.componentInstance.countdown).toBe(299);
      expect(text()).toContain('04:59');

      jest.advanceTimersByTime(1000);
      expect(localFixture.componentInstance.countdown).toBe(298);
      expect(text()).toContain('04:58');

      localFixture.destroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should stop the countdown once it reaches zero', () => {
    jest.useFakeTimers();
    try {
      const clearSpy = jest.spyOn(globalThis, 'clearInterval');
      mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(0);

      const localFixture = TestBed.createComponent(
        RefreshSessionDialogComponent,
      );
      localFixture.detectChanges();

      jest.advanceTimersByTime(1000);

      expect(localFixture.componentInstance.countdown).toBe(0);
      expect(clearSpy).toHaveBeenCalled();

      localFixture.destroy();
      clearSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });
});
