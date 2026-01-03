import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { Platform, StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { AccountsComponent } from './accounts.component';
import { AccountDialogComponent } from './dialogs/account-dialog/account-dialog.component';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let dialogSpy: jest.Mocked<MatDialog>;

  const mockAccount: StoAccount = {
    id: '1',
    handle: 'Test#1234',
    accountCreatedDate: '2023-01-01',
    publiclyVisible: true,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    platformId: 'p1',
    userId: 'u1',
  };

  beforeEach(async () => {
    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([])),
      getPlatforms: jest.fn().mockReturnValue(of([])),
      deleteAccount: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<StoAccountService>;

    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('test-link'),
    } as unknown as jest.Mocked<RoutingService>;

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [AccountsComponent, RouterTestingModule],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
      ],
    })
      .overrideComponent(AccountsComponent, {
        add: {
          providers: [{ provide: MatDialog, useValue: dialogSpy }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts on init', () => {
    const accounts = [mockAccount];
    const platforms: Platform[] = [{ id: 'p1', name: 'Windows' } as Platform];
    stoAccountServiceSpy.getAccounts.mockReturnValue(of(accounts));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(of(platforms));

    component.ngOnInit();

    expect(component.accounts).toEqual(accounts);
    expect(component.platforms).toEqual(platforms);
    expect(component.isLoading).toBe(false);
  });

  it('should handle error when loading accounts', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      throwError(() => new Error('error')),
    );

    component.loadAccounts();

    expect(component.isLoading).toBe(false);
  });

  it('should open add account dialog', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.addAccount();

    expect(dialogSpy.open).toHaveBeenCalledWith(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'add' },
    });
    expect(loadAccountsSpy).toHaveBeenCalled();
  });

  it('should open edit account dialog', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.editAccount(mockAccount);

    expect(dialogSpy.open).toHaveBeenCalledWith(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'edit', account: mockAccount },
    });
    expect(loadAccountsSpy).toHaveBeenCalled();
  });

  it('should not reload if add dialog closed without result', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.addAccount();

    expect(loadAccountsSpy).not.toHaveBeenCalled();
  });

  it('should not reload if edit dialog closed without result', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.editAccount(mockAccount);

    expect(loadAccountsSpy).not.toHaveBeenCalled();
  });

  describe('deleteAccount', () => {
    it('should delete account if confirmed', () => {
      const dialogRefSpy = {
        afterClosed: jest.fn().mockReturnValue(of(true)),
      };
      dialogSpy.open.mockReturnValue(dialogRefSpy as never);
      const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

      component.deleteAccount(mockAccount);

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.any(Object),
      );
      expect(stoAccountServiceSpy.deleteAccount).toHaveBeenCalledWith(
        mockAccount.id,
      );
      expect(loadAccountsSpy).toHaveBeenCalled();
    });

    it('should not delete account if not confirmed', () => {
      const dialogRefSpy = {
        afterClosed: jest.fn().mockReturnValue(of(false)),
      };
      dialogSpy.open.mockReturnValue(dialogRefSpy as never);

      component.deleteAccount(mockAccount);

      expect(stoAccountServiceSpy.deleteAccount).not.toHaveBeenCalled();
    });
  });

  it('should get route link', () => {
    const link = component.getRouteLink('test');
    expect(link).toBe('test-link');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('test');
  });

  it('should return correct platform icon', () => {
    component.platforms = [{ id: 'p1', name: 'Windows' } as Platform];
    expect(component.getPlatformIcon('p1')).toEqual(['fab', 'windows']);

    component.platforms = [{ id: 'p2', name: 'PlayStation' } as Platform];
    expect(component.getPlatformIcon('p2')).toEqual(['fab', 'playstation']);

    component.platforms = [{ id: 'p3', name: 'Xbox' } as Platform];
    expect(component.getPlatformIcon('p3')).toEqual(['fab', 'xbox']);

    component.platforms = [{ id: 'p4', name: 'Nintendo Switch' } as Platform];
    expect(component.getPlatformIcon('p4')).toEqual(['fas', 'circle-question']);

    expect(component.getPlatformIcon('unknown')).toEqual([
      'fas',
      'circle-question',
    ]);
    expect(component.getPlatformIcon()).toEqual(['fas', 'circle-question']);
  });
});
