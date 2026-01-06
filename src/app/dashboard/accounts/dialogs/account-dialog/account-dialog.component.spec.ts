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
import {
  Launcher,
  Platform,
  PlatformLauncher,
  StoAccount,
} from 'src/app/dashboard/models/sto-account.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { AccountDialogComponent } from './account-dialog.component';

describe('AccountDialogComponent', () => {
  let component: AccountDialogComponent;
  let fixture: ComponentFixture<AccountDialogComponent>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let dialogRefSpy: jest.Mocked<MatDialogRef<AccountDialogComponent>>;

  const mockPlatforms: Platform[] = [
    { id: 'p1', name: 'PC', createdAt: '', updatedAt: '' },
    { id: 'p2', name: 'Console', createdAt: '', updatedAt: '' },
  ];

  const mockLaunchers: Launcher[] = [
    { id: 'l1', name: 'Arc', createdAt: '', updatedAt: '' },
    { id: 'l2', name: 'Steam', createdAt: '', updatedAt: '' },
  ];

  const mockMappings: PlatformLauncher[] = [
    { platformId: 'p1', launcherId: 'l1', createdAt: '', updatedAt: '' },
    { platformId: 'p1', launcherId: 'l2', createdAt: '', updatedAt: '' },
  ];

  const mockAccount: StoAccount = {
    id: '1',
    handle: 'Test',
    username: 'user',
    email: 'test@test.com',
    notes: 'notes',
    accountCreatedDate: '2023-01-01T00:00:00.000Z',
    publiclyVisible: true,
    lifetimeSubscription: true,
    platformId: 'p1',
    launcherId: 'l1',
    userId: 'u1',
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(async () => {
    stoAccountServiceSpy = {
      getPlatforms: jest.fn().mockReturnValue(of(mockPlatforms)),
      getLaunchers: jest.fn().mockReturnValue(of(mockLaunchers)),
      getPlatformLaunchers: jest.fn().mockReturnValue(of(mockMappings)),
      createAccount: jest.fn().mockReturnValue(of(mockAccount)),
      updateAccount: jest.fn().mockReturnValue(of(mockAccount)),
    } as unknown as jest.Mocked<StoAccountService>;

    dialogRefSpy = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<AccountDialogComponent>>;

    await TestBed.configureTestingModule({
      imports: [
        AccountDialogComponent,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'add' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize metadata on init', () => {
    fixture.detectChanges();
    expect(stoAccountServiceSpy.getPlatforms).toHaveBeenCalled();
    expect(stoAccountServiceSpy.getLaunchers).toHaveBeenCalled();
    expect(stoAccountServiceSpy.getPlatformLaunchers).toHaveBeenCalled();
    expect(component.platforms).toEqual(mockPlatforms);
    expect(component.launchers).toEqual(mockLaunchers);
    expect(component.platformLaunchers).toEqual(mockMappings);
  });

  it('should handle error when loading metadata', () => {
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      throwError(() => new Error('error')),
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Error loading metadata. Please try again.',
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should filter launchers if platformId is already set when mappings load', () => {
    component.accountForm.patchValue({ platformId: 'p1' });
    fixture.detectChanges();
    expect(component.filteredLaunchers.length).toBe(2);
  });

  it('should patch form in edit mode', () => {
    component.data = { mode: 'edit', account: mockAccount };
    fixture.detectChanges();

    expect(component.accountForm.value.handle).toBe(mockAccount.handle);
    expect(component.accountForm.value.lifetimeSubscription).toBe(
      mockAccount.lifetimeSubscription,
    );
    expect(component.accountForm.value.platformId).toBe(mockAccount.platformId);
  });

  it('should not patch form in edit mode if account is missing', () => {
    component.data = { mode: 'edit', account: undefined };
    fixture.detectChanges();

    expect(component.accountForm.value.handle).toBe('');
  });

  it('should filter launchers based on platformId', () => {
    fixture.detectChanges();
    component.accountForm.patchValue({ platformId: 'p1' });
    expect(component.filteredLaunchers.length).toBe(2);

    component.accountForm.patchValue({ platformId: 'p2' });
    expect(component.filteredLaunchers.length).toBe(0);
  });

  it('should not filter launchers if platformId is set to null', () => {
    fixture.detectChanges();
    const filterSpy = jest.spyOn(component, 'filterLaunchers');
    component.accountForm.patchValue({ platformId: null });
    expect(filterSpy).not.toHaveBeenCalled();
  });

  it('should reset launcherId if not valid for selected platform', () => {
    fixture.detectChanges();
    component.accountForm.patchValue({ platformId: 'p1', launcherId: 'l1' });
    component.accountForm.patchValue({ platformId: 'p2' });
    expect(component.accountForm.value.launcherId).toBe('');
  });

  describe('save', () => {
    it('should not call service if form is invalid', () => {
      fixture.detectChanges();
      component.accountForm.patchValue({ handle: '' });
      component.onSaveClick();
      expect(stoAccountServiceSpy.createAccount).not.toHaveBeenCalled();
    });

    it('should call createAccount in add mode', fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Flush metadata loading
      component.accountForm.patchValue({
        handle: 'New#1234',
        platformId: 'p1',
        accountCreatedDate: '2023-01-01',
      });
      component.onSaveClick();
      tick();
      expect(stoAccountServiceSpy.createAccount).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    }));

    it('should call createAccount with only handle', fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Flush metadata loading
      component.accountForm.patchValue({
        handle: 'New#1234',
        platformId: '',
        launcherId: '',
      });
      // The default accountCreatedDate is set in the constructor, so we clear it for this test if we want to be strict,
      // but the requirement is that ONLY handle is required.
      expect(component.accountForm.valid).toBe(true);
      component.onSaveClick();
      tick();
      expect(stoAccountServiceSpy.createAccount).toHaveBeenCalled();
    }));

    it('should handle error in createAccount', fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Flush metadata loading
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      stoAccountServiceSpy.createAccount.mockReturnValue(
        throwError(() => new Error('error')),
      );
      component.accountForm.patchValue({
        handle: 'New#1234',
        platformId: 'p1',
        accountCreatedDate: '2023-01-01',
      });
      component.onSaveClick();
      tick();
      expect(component.errorMessage).toBe(
        'An error occurred while creating the account. Please try again.',
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    }));

    it('should handle 409 error in createAccount', fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Flush metadata loading
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorResponse = {
        status: 409,
        error: { message: 'Handle already exists' },
      };
      stoAccountServiceSpy.createAccount.mockReturnValue(
        throwError(() => errorResponse),
      );
      component.accountForm.patchValue({ handle: 'New#1234' });
      component.onSaveClick();
      tick();

      expect(component.errorMessage).toBe('Handle already exists');
      consoleSpy.mockRestore();
    }));

    it('should call updateAccount in edit mode', () => {
      component.data = { mode: 'edit', account: mockAccount };
      fixture.detectChanges();
      component.accountForm.patchValue({ handle: 'Updated' });
      component.onSaveClick();
      expect(stoAccountServiceSpy.updateAccount).toHaveBeenCalledWith(
        mockAccount.id,
        expect.anything(),
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('should handle error in updateAccount', () => {
      component.data = { mode: 'edit', account: mockAccount };
      fixture.detectChanges();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      stoAccountServiceSpy.updateAccount.mockReturnValue(
        throwError(() => new Error('error')),
      );
      component.accountForm.patchValue({ handle: 'Updated' });
      component.onSaveClick();
      expect(component.errorMessage).toBe(
        'An error occurred while updating the account. Please try again.',
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle 409 error in updateAccount', () => {
      component.data = { mode: 'edit', account: mockAccount };
      fixture.detectChanges();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorResponse = {
        status: 409,
        error: { message: 'Handle already exists' },
      };
      stoAccountServiceSpy.updateAccount.mockReturnValue(
        throwError(() => errorResponse),
      );
      component.accountForm.patchValue({ handle: 'Updated' });
      component.onSaveClick();

      expect(component.errorMessage).toBe('Handle already exists');
      consoleSpy.mockRestore();
    });

    it('should not call updateAccount if mode is edit but account is missing', () => {
      component.data = { mode: 'edit', account: undefined };
      fixture.detectChanges();
      component.accountForm.patchValue({
        handle: 'Updated',
        platformId: 'p1',
        accountCreatedDate: '2023-01-01',
      });
      component.onSaveClick();
      expect(stoAccountServiceSpy.updateAccount).not.toHaveBeenCalled();
    });

    it('should use default error message for 409 error in createAccount if message is missing', fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Flush metadata loading
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorResponse = {
        status: 409,
        error: {},
      };
      stoAccountServiceSpy.createAccount.mockReturnValue(
        throwError(() => errorResponse),
      );
      component.accountForm.patchValue({ handle: 'New#1234' });
      component.onSaveClick();
      tick();

      expect(component.errorMessage).toBe(
        'A STO account with this handle already exists.',
      );
      consoleSpy.mockRestore();
    }));

    it('should use default error message for 409 error in updateAccount if message is missing', () => {
      component.data = { mode: 'edit', account: mockAccount };
      fixture.detectChanges();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorResponse = {
        status: 409,
        error: null,
      };
      stoAccountServiceSpy.updateAccount.mockReturnValue(
        throwError(() => errorResponse),
      );
      component.accountForm.patchValue({ handle: 'Updated' });
      component.onSaveClick();

      expect(component.errorMessage).toBe(
        'A STO account with this handle already exists.',
      );
      consoleSpy.mockRestore();
    });
  });

  describe('edit mode edge cases', () => {
    it('should handle missing accountCreatedDate, platformId and launcherId in edit mode', () => {
      const incompleteAccount: StoAccount = {
        ...mockAccount,
        accountCreatedDate: undefined,
        platformId: undefined,
        launcherId: undefined,
      };
      component.data = { mode: 'edit', account: incompleteAccount };
      fixture.detectChanges();

      expect(component.accountForm.value.accountCreatedDate).toBe('');
      expect(component.accountForm.value.platformId).toBe('');
      expect(component.accountForm.value.launcherId).toBe('');
    });

    it('should handle undefined lifetimeSubscription in edit mode', () => {
      const accountWithoutLifetime: StoAccount = {
        ...mockAccount,
        lifetimeSubscription: undefined as unknown as boolean,
      };
      component.data = { mode: 'edit', account: accountWithoutLifetime };
      fixture.detectChanges();

      expect(component.accountForm.value.lifetimeSubscription).toBe(false);
    });
  });

  it('should close on cancel', () => {
    fixture.detectChanges();
    component.onCancelClick();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
