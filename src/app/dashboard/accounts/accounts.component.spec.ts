import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { Character } from '../models/character.model';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { CharacterService } from '../services/character.service';
import { StoAccountService } from '../services/sto-account.service';
import { AccountsComponent } from './accounts.component';
import { AccountDialogComponent } from './dialogs/account-dialog/account-dialog.component';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let dialogSpy: jest.Mocked<MatDialog>;

  const mockAccount: StoAccount = {
    id: '1',
    handle: 'Test#1234',
    accountCreatedDate: '2023-01-01',
    publiclyVisible: true,
    lifetimeSubscription: true,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    platformId: 'p1',
    userId: 'u1',
  };

  beforeEach(async () => {
    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([])),
      getPlatforms: jest.fn().mockReturnValue(of([])),
      getLaunchers: jest.fn().mockReturnValue(of([])),
      deleteAccount: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<StoAccountService>;

    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('test-link'),
    } as unknown as jest.Mocked<RoutingService>;

    characterServiceSpy = {
      getCharacters: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<CharacterService>;

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [AccountsComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        // We still provide it here as fallback/base
        { provide: MatDialog, useValue: dialogSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AccountsComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
  });

  it('should encode handle', () => {
    expect(component.encodeHandle('Test#1234')).toBe('Test~1234');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts and characters on init', () => {
    const accounts = [mockAccount];
    const platforms: Platform[] = [{ id: 'p1', name: 'Windows' } as Platform];
    const launchers: Launcher[] = [{ id: 'l1', name: 'Steam' } as Launcher];
    const characters: Partial<Character>[] = [
      { accountId: '1' },
      { accountId: '1' },
    ]; // 2 chars for account 1

    stoAccountServiceSpy.getAccounts.mockReturnValue(of(accounts));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(of(platforms));
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of(launchers));
    characterServiceSpy.getCharacters.mockReturnValue(
      of(characters as Character[]),
    );

    component.ngOnInit();

    expect(component.accounts).toEqual(accounts);
    expect(component.platforms).toEqual(platforms);
    expect(component.launchers).toEqual(launchers);
    expect(component.characterCounts['1']).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('should handle error when loading accounts', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      throwError(() => new Error('error')),
    );
    component.ngOnInit(); // calls loadAccounts
    expect(component.isLoading).toBe(false);
  });

  it('should handle error when loading characters', () => {
    const accounts = [mockAccount];
    stoAccountServiceSpy.getAccounts.mockReturnValue(of(accounts));
    characterServiceSpy.getCharacters.mockReturnValue(
      throwError(() => new Error('Error')),
    );

    component.loadAccounts();
    expect(component.isLoading).toBe(false);
    expect(characterServiceSpy.getCharacters).toHaveBeenCalled();
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

  it('should not reload accounts if add dialog canceled', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.addAccount();
    expect(loadAccountsSpy).not.toHaveBeenCalled();
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

  it('should not reload accounts if edit dialog canceled', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.editAccount(mockAccount);
    expect(loadAccountsSpy).not.toHaveBeenCalled();
  });

  it('should delete account', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);
    const loadAccountsSpy = jest.spyOn(component, 'loadAccounts');

    component.deleteAccount(mockAccount);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(stoAccountServiceSpy.deleteAccount).toHaveBeenCalledWith(
      mockAccount.id,
    );
    expect(loadAccountsSpy).toHaveBeenCalled();
  });

  it('should not delete account if cancelled', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    dialogSpy.open.mockReturnValue(dialogRefSpy as never);

    component.deleteAccount(mockAccount);

    expect(stoAccountServiceSpy.deleteAccount).not.toHaveBeenCalled();
  });

  describe('getPlatformIcon', () => {
    beforeEach(() => {
      component.platforms = [
        { id: 'arc', name: 'Arc' },
        { id: 'epic', name: 'Epic' },
        { id: 'steam', name: 'Steam' },
        { id: 'win', name: 'Windows' },
        { id: 'ps', name: 'PlayStation' },
        { id: 'xbox', name: 'Xbox' },
        { id: 'unknown', name: 'Unknown' },
      ] as Platform[];
    });

    it('should return null if platformId undefined', () => {
      expect(component.getPlatformIcon(undefined)).toBeNull();
    });

    it('should return null if platform not found', () => {
      expect(component.getPlatformIcon('missing')).toBeNull();
    });

    it('should return arc icon', () => {
      expect(component.getPlatformIcon('arc')).toEqual(['fak', 'arc-games']);
    });
    it('should return epic icon', () => {
      expect(component.getPlatformIcon('epic')).toEqual(['fak', 'epic-games']);
    });
    it('should return steam icon', () => {
      expect(component.getPlatformIcon('steam')).toEqual(['fab', 'steam']);
    });
    it('should return windows icon', () => {
      expect(component.getPlatformIcon('win')).toEqual(['fab', 'windows']);
    });
    it('should return playstation icon', () => {
      expect(component.getPlatformIcon('ps')).toEqual(['fab', 'playstation']);
    });
    it('should return xbox icon', () => {
      expect(component.getPlatformIcon('xbox')).toEqual(['fab', 'xbox']);
    });
    it('should return null for unknown platform', () => {
      expect(component.getPlatformIcon('unknown')).toBeNull();
    });
  });

  describe('getLauncherIcon', () => {
    beforeEach(() => {
      component.launchers = [
        { id: 'arc', name: 'Arc' },
        { id: 'epic', name: 'Epic' },
        { id: 'steam', name: 'Steam' },
        { id: 'unknown', name: 'Unknown' },
      ] as Launcher[];
    });

    it('should return null if launcherId undefined', () => {
      expect(component.getLauncherIcon(undefined)).toBeNull();
    });

    it('should return null if launcher not found', () => {
      expect(component.getLauncherIcon('missing')).toBeNull();
    });

    it('should return arc icon', () => {
      expect(component.getLauncherIcon('arc')).toEqual(['fak', 'arc-games']);
    });

    it('should return epic icon', () => {
      expect(component.getLauncherIcon('epic')).toEqual(['fak', 'epic-games']);
    });

    it('should return steam icon', () => {
      expect(component.getLauncherIcon('steam')).toEqual(['fab', 'steam']);
    });

    it('should return null for unknown launcher', () => {
      expect(component.getLauncherIcon('unknown')).toBeNull();
    });
  });

  it('should get platform by id', () => {
    component.platforms = [{ id: 'p1', name: 'P1' } as Platform];
    expect(component.getPlatform('p1')).toBeDefined();
    expect(component.getPlatform('p2')).toBeUndefined();
    expect(component.getPlatform(undefined)).toBeUndefined();
  });

  it('should get launcher by id', () => {
    component.launchers = [{ id: 'l1', name: 'L1' } as Launcher];
    expect(component.getLauncher('l1')).toBeDefined();
    expect(component.getLauncher('l2')).toBeUndefined();
    expect(component.getLauncher(undefined)).toBeUndefined();
  });

  it('should get route link', () => {
    expect(component.getRouteLink('home')).toBe('test-link');
  });
});
