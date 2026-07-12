import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  Launcher,
  PlatformLauncher,
} from 'src/app/dashboard/models/sto-account.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { AccountManageComponent } from './account-manage.component';

describe('AccountManageComponent', () => {
  let component: AccountManageComponent;
  let fixture: ComponentFixture<AccountManageComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let routerSpy: jest.Mocked<Router>;
  let consoleErrorSpy: jest.SpyInstance;

  const mockAccount: StoAccount = {
    id: 'acc1',
    handle: 'Test#1234',
    accountCreatedDate: '2023-01-01T00:00:00.000Z',
    publiclyVisible: true,
    lifetimeSubscription: false,
    platformId: 'p1',
    launcherId: 'l1',
    userId: 'u1',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  } as StoAccount;

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    stoAccountServiceSpy = {
      getPlatforms: jest.fn().mockReturnValue(of([{ id: 'p1', name: 'PC' }])),
      getLaunchers: jest
        .fn()
        .mockReturnValue(of([{ id: 'l1', name: 'Steam' }])),
      getPlatformLaunchers: jest
        .fn()
        .mockReturnValue(of([{ platformId: 'p1', launcherId: 'l1' }])),
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
      createAccount: jest.fn().mockReturnValue(of(mockAccount)),
      updateAccount: jest.fn().mockReturnValue(of(mockAccount)),
    } as unknown as jest.Mocked<StoAccountService>;

    routerSpy = {
      navigate: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<Router>;

    await TestBed.configureTestingModule({
      imports: [AccountManageComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountManageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose accounts link', () => {
    expect(component.accountsLink).toBe('/dashboard/accounts');
  });

  it('should initialize in add mode when no handle route param', () => {
    fixture.detectChanges();
    routeParams$.next({});

    expect(component.mode).toBe('add');
    expect(stoAccountServiceSpy.getAccounts).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should initialize in edit mode and patch form fields', () => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234' });

    expect(component.mode).toBe('edit');
    expect(stoAccountServiceSpy.getAccounts).toHaveBeenCalled();
    expect(component.account?.id).toBe('acc1');
    expect(component.accountForm.get('handle')?.value).toBe('Test#1234');
    expect(component.accountForm.get('accountCreatedDate')?.value).toBe(
      '2023-01-01',
    );
    expect(component.isLoading).toBe(false);
  });

  it('should patch empty platform/launcher values when not present on account', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      of([
        {
          ...mockAccount,
          accountCreatedDate: undefined,
          platformId: undefined,
          launcherId: undefined,
        } as StoAccount,
      ]),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234' });

    expect(component.accountForm.get('platformId')?.value).toBe('');
    expect(component.accountForm.get('launcherId')?.value).toBe('');
    expect(component.accountForm.get('accountCreatedDate')?.value).toBe('');
  });

  it('should set account-not-found error in edit mode', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Missing~1234' });

    expect(component.errorMessage).toBe('Account not found.');
    expect(component.isLoading).toBe(false);
  });

  it('should set metadata error when load metadata fails', () => {
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    component.loadMetadata();

    expect(component.errorMessage).toBe(
      'Error loading account metadata. Please try again.',
    );
    expect(component.isLoading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should clear launcher when platform is not selected', () => {
    component.accountForm.patchValue({ launcherId: 'l1' });
    component.filterLaunchers('');

    expect(component.filteredLaunchers).toEqual([]);
    expect(component.accountForm.get('launcherId')?.value).toBe('');
  });

  it('should keep only mapped launchers for selected platform', () => {
    component.launchers = [
      { id: 'l1', name: 'Steam' },
      { id: 'l2', name: 'Arc' },
    ] as Launcher[];
    component.platformLaunchers = [
      { platformId: 'p1', launcherId: 'l2' },
    ] as PlatformLauncher[];

    component.filterLaunchers('p1');

    expect(component.filteredLaunchers.map(l => l.id)).toEqual(['l2']);
  });

  it('should reset selected launcher if it is invalid for platform', () => {
    component.launchers = [
      { id: 'l1', name: 'Steam' },
      { id: 'l2', name: 'Arc' },
    ] as Launcher[];
    component.platformLaunchers = [
      { platformId: 'p1', launcherId: 'l2' },
    ] as PlatformLauncher[];
    component.accountForm.patchValue({ launcherId: 'l1' });

    component.filterLaunchers('p1');

    expect(component.accountForm.get('launcherId')?.value).toBe('');
  });

  it('should return launcher disabled state and placeholder text', () => {
    component.filteredLaunchers = [];
    component.accountForm.patchValue({ platformId: '' });
    expect(component.isLauncherDisabled).toBe(true);
    expect(component.launcherPlaceholderText).toBe('Select a platform first');

    component.accountForm.patchValue({ platformId: 'p1' });
    expect(component.isLauncherDisabled).toBe(true);
    expect(component.launcherPlaceholderText).toBe(
      'Not applicable for this platform',
    );

    component.filteredLaunchers = [{ id: 'l1', name: 'Steam' }] as Launcher[];
    expect(component.isLauncherDisabled).toBe(false);
  });

  it('should not submit when form is invalid', () => {
    component.accountForm.patchValue({ handle: '' });

    component.onSave();

    expect(stoAccountServiceSpy.createAccount).not.toHaveBeenCalled();
    expect(stoAccountServiceSpy.updateAccount).not.toHaveBeenCalled();
  });

  it('should create account in add mode and navigate to detail', () => {
    component.mode = 'add';
    component.accountForm.patchValue({ handle: 'Test#1234' });

    component.onSave();

    expect(stoAccountServiceSpy.createAccount).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Test~1234',
    ]);
    expect(component.isSubmitting).toBe(false);
  });

  it('should handle create conflict error', () => {
    component.mode = 'add';
    component.accountForm.patchValue({ handle: 'Test#1234' });
    stoAccountServiceSpy.createAccount.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Duplicate handle' },
      })),
    );

    component.onSave();

    expect(component.errorMessage).toBe('Duplicate handle');
    expect(component.isSubmitting).toBe(false);
  });

  it('should use default create conflict message when API message is missing', () => {
    component.mode = 'add';
    component.accountForm.patchValue({ handle: 'Test#1234' });
    stoAccountServiceSpy.createAccount.mockReturnValue(
      throwError(() => ({ status: 409, error: {} })),
    );

    component.onSave();

    expect(component.errorMessage).toBe(
      'A STO account with this handle already exists.',
    );
  });

  it('should use default create conflict message when error body is absent', () => {
    component.mode = 'add';
    component.accountForm.patchValue({ handle: 'Test#1234' });
    stoAccountServiceSpy.createAccount.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );

    component.onSave();

    expect(component.errorMessage).toBe(
      'A STO account with this handle already exists.',
    );
  });

  it('should handle create generic error', () => {
    component.mode = 'add';
    component.accountForm.patchValue({ handle: 'Test#1234' });
    stoAccountServiceSpy.createAccount.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    component.onSave();

    expect(component.errorMessage).toBe(
      'An error occurred while creating the account. Please try again.',
    );
  });

  it('should no-op update when account is missing in edit mode', () => {
    component.mode = 'edit';
    component.account = null;
    component.accountForm.patchValue({ handle: 'Test#1234' });

    component.onSave();

    expect(stoAccountServiceSpy.updateAccount).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBe(false);
  });

  it('should update account and use updated handle when provided', () => {
    component.mode = 'edit';
    component.account = mockAccount;
    component.accountForm.patchValue({ handle: 'Changed#1234' });
    stoAccountServiceSpy.updateAccount.mockReturnValue(
      of({ ...mockAccount, handle: 'Changed#1234' } as StoAccount),
    );

    component.onSave();

    expect(stoAccountServiceSpy.updateAccount).toHaveBeenCalledWith(
      'acc1',
      expect.anything(),
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Changed~1234',
    ]);
  });

  it('should update account and fallback to form handle when response handle is missing', () => {
    component.mode = 'edit';
    component.account = mockAccount;
    component.accountForm.patchValue({ handle: 'Changed#1234' });
    stoAccountServiceSpy.updateAccount.mockReturnValue(of({} as StoAccount));

    component.onSave();

    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Changed~1234',
    ]);
  });

  it('should handle update conflict and generic errors', () => {
    component.mode = 'edit';
    component.account = mockAccount;
    component.accountForm.patchValue({ handle: 'Test#1234' });

    stoAccountServiceSpy.updateAccount.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Duplicate handle' },
      })),
    );
    component.onSave();
    expect(component.errorMessage).toBe('Duplicate handle');

    stoAccountServiceSpy.updateAccount.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    component.onSave();
    expect(component.errorMessage).toBe(
      'An error occurred while updating the account. Please try again.',
    );
  });

  it('should use default update conflict message when API message is missing', () => {
    component.mode = 'edit';
    component.account = mockAccount;
    component.accountForm.patchValue({ handle: 'Test#1234' });

    stoAccountServiceSpy.updateAccount.mockReturnValue(
      throwError(() => ({ status: 409, error: {} })),
    );
    component.onSave();

    expect(component.errorMessage).toBe(
      'A STO account with this handle already exists.',
    );
  });

  it('should cancel to account detail in edit mode', () => {
    component.mode = 'edit';
    component.account = mockAccount;

    component.onCancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Test~1234',
    ]);
  });

  it('should cancel to account list in add mode', () => {
    component.mode = 'add';
    component.account = null;

    component.onCancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/accounts']);
  });

  it('should complete destroy stream on destroy', () => {
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
