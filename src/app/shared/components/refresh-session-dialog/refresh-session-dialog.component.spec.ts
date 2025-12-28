import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';
import { RefreshSessionDialogComponent } from './refresh-session-dialog.component';

describe('RefreshSessionDialogComponent', () => {
  let component: RefreshSessionDialogComponent;
  let fixture: ComponentFixture<RefreshSessionDialogComponent>;
  let mockDialogRef: jest.Mocked<MatDialogRef<RefreshSessionDialogComponent>>;
  let mockAppComponent: Partial<AppComponent>;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<RefreshSessionDialogComponent>>;

    mockAppComponent = {
      logout: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RefreshSessionDialogComponent, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
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
});
