import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { User } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import {
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { EditPersonalDetailsComponent } from './edit-personal-details.component';

describe('EditPersonalDetailsComponent', () => {
  let component: EditPersonalDetailsComponent;
  let fixture: ComponentFixture<EditPersonalDetailsComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockRoutingService: jest.Mocked<RoutingService>;
  let mockDialogRef: jest.Mocked<MatDialogRef<EditPersonalDetailsComponent>>;

  const mockUser: User = {
    id: '123',
    profile: {
      firstName: 'Jean-Luc',
      lastName: 'Picard',
      username: 'jpicard',
    },
  } as User;

  beforeEach(async () => {
    mockDashboardService = {
      updatePersonalDetails: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;

    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<EditPersonalDetailsComponent>>;

    await TestBed.configureTestingModule({
      imports: [
        EditPersonalDetailsComponent,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { user: mockUser } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditPersonalDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with user data', () => {
    expect(component.editPersonalDetailsForm.value).toEqual({
      firstName: 'Jean-Luc',
      lastName: 'Picard',
      username: 'jpicard',
      publiclyVisible: false,
    });
  });

  it('should seed the registry opt-in from the stored profile flag', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EditPersonalDetailsComponent, ReactiveFormsModule],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { user: { profile: { publiclyVisible: true } } },
        },
      ],
    }).compileComponents();

    const optedInFixture = TestBed.createComponent(
      EditPersonalDetailsComponent,
    );
    optedInFixture.detectChanges();

    expect(
      optedInFixture.componentInstance.editPersonalDetailsForm.value
        .publiclyVisible,
    ).toBe(true);
  });

  describe('onSaveClick', () => {
    it('should call updatePersonalDetails and close dialog on success', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        of({ affected: 1, userProfileData: null }),
      );

      component.onSaveClick();

      expect(mockDashboardService.updatePersonalDetails).toHaveBeenCalledWith(
        component.editPersonalDetailsForm.value,
      );
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should handle HTTP 0 error', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        throwError(() => ({ status: 0 })),
      );
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      component.onSaveClick();

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle HTTP 400 error', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        throwError(() => ({ status: 400 })),
      );

      component.onSaveClick();

      expect(component.errorMessage).toBe(
        MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
      );
    });

    it('should handle HTTP 409 conflict error for username', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Username already taken' },
        })),
      );

      component.onSaveClick();

      expect(
        component.editPersonalDetailsForm.controls['username'].hasError(
          'uniqueUsername',
        ),
      ).toBe(true);
    });

    it('should handle unexpected errors', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      component.onSaveClick();

      expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    });

    it('should handle HTTP 409 conflict error that is not username related', () => {
      mockDashboardService.updatePersonalDetails.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Email conflict' },
        })),
      );

      component.onSaveClick();

      expect(
        component.editPersonalDetailsForm.controls['username'].hasError(
          'uniqueUsername',
        ),
      ).toBe(false);
    });
  });

  it('should initialize with empty strings if no user data provided', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        EditPersonalDetailsComponent,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(EditPersonalDetailsComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.editPersonalDetailsForm.value).toEqual({
      firstName: '',
      lastName: '',
      username: '',
      publiclyVisible: false,
    });
  });

  it('should display error message for a limited time', fakeAsync(() => {
    component.displayErrorMessage('Test Error');
    expect(component.errorMessage).toBe('Test Error');

    tick(component.showErrorMilliseconds);
    expect(component.errorMessage).toBe('');
  }));

  it('should return route link', () => {
    expect(component.getRouteLink('test')).toBe('/mock-route');
  });

  it('should close dialog on cancel', () => {
    component.onCloseClick();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  describe('Form Validation', () => {
    it('should be invalid when empty', () => {
      component.editPersonalDetailsForm.patchValue({
        firstName: '',
        lastName: '',
        username: '',
      });
      expect(component.editPersonalDetailsForm.invalid).toBe(true);
    });

    it('should validate username pattern', () => {
      const control = component.editPersonalDetailsForm.controls['username'];
      control.setValue('invalid username!');
      expect(control.hasError('pattern')).toBe(true);

      control.setValue('validusername123');
      expect(control.valid).toBe(true);
    });
  });
});
