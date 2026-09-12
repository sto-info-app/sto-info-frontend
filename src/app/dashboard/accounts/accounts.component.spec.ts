import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { PrivacyModeService } from '../services/privacy-mode.service';
import { StoAccountService } from '../services/sto-account.service';
import { AccountsComponent, AccountVm } from './accounts.component';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let privacyModeServiceSpy: Pick<PrivacyModeService, 'isEnabled' | 'load'>;
  let dialogSpy: jest.Mocked<MatDialog>;
  let router: Router;

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
      setAccountPinned: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<StoAccountService>;

    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('test-link'),
    } as unknown as jest.Mocked<RoutingService>;

    privacyModeServiceSpy = {
      isEnabled: signal(false),
      load: jest.fn().mockReturnValue(of({ privacyMode: false })),
    };

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: PrivacyModeService, useValue: privacyModeServiceSpy },
        provideRouter([]),
        provideNoopAnimations(),
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
    router = TestBed.inject(Router);
  });

  it('should encode handle', () => {
    expect(component.encodeHandle('Test#1234')).toBe('Test~1234');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts on init', () => {
    const accounts = [{ ...mockAccount, characterCount: 2 }];
    const platforms: Platform[] = [{ id: 'p1', name: 'Windows' } as Platform];
    const launchers: Launcher[] = [{ id: 'l1', name: 'Steam' } as Launcher];

    stoAccountServiceSpy.getAccounts.mockReturnValue(of(accounts));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(of(platforms));
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of(launchers));

    component.ngOnInit();

    expect(component.accounts).toEqual(accounts);
    expect(component.platforms).toEqual(platforms);
    expect(component.launchers).toEqual(launchers);
    expect(component.accounts[0].characterCount).toBe(2);
    expect(component.isLoading).toBe(false);

    expect(component.accountVms()).toHaveLength(1);
    const vm: AccountVm = component.accountVms()[0];
    expect(vm.id).toBe(mockAccount.id);
    expect(vm.account).toBe(accounts[0]);
    expect(vm.card.link).toBe('/dashboard/accounts/Test~1234');
    expect(vm.platformIcon).toBe('fab fa-windows');
    expect(vm.card.platformName).toBe('Windows');
    expect(vm.launcherIcon).toBeNull();
    expect(vm.card.launcherName).toBeNull();
    expect(vm.card.characterCount).toBe(2);
  });

  it('should build accountVm with launcher info and fallback platform name', () => {
    const accountWithLauncher = {
      ...mockAccount,
      platformId: 'missing',
      launcherId: 'l1',
    };
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([accountWithLauncher]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(of([]));
    stoAccountServiceSpy.getLaunchers.mockReturnValue(
      of([{ id: 'l1', name: 'Steam' } as Launcher]),
    );

    component.ngOnInit();

    const vm: AccountVm = component.accountVms()[0];
    expect(vm.platformIcon).toBeNull();
    expect(vm.card.platformName).toBe('Platform');
    expect(vm.launcherIcon).toBe('fab fa-steam');
    expect(vm.card.launcherName).toBe('Steam');
    expect(vm.card.characterCount).toBe(0);
  });

  it('should handle error when loading accounts', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      throwError(() => new Error('error')),
    );
    component.ngOnInit(); // calls loadAccounts
    expect(component.isLoading).toBe(false);
  });

  it('should navigate to add account page', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.addAccount();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard/accounts/add']);
  });

  it('should build email and notes detail rows when present', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      of([
        {
          ...mockAccount,
          email: 'captain@example.com',
          notes: 'Primary account.',
        } as StoAccount,
      ]),
    );

    component.ngOnInit();

    const details = component.accountVms()[0].card.details;
    expect(details).toEqual([
      expect.objectContaining({
        label: 'Email',
        text: 'captain@example.com',
        variant: 'secondary',
      }),
      expect.objectContaining({
        label: 'Notes',
        text: 'Primary account.',
        variant: 'muted',
      }),
    ]);
  });

  it('should label an unresolved launcher generically', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      of([{ ...mockAccount, launcherId: 'missing' } as StoAccount]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of([]));

    component.ngOnInit();

    expect(component.accountVms()[0].card.launcherName).toBe('Launcher');
  });

  describe('onAccountCardAction', () => {
    it('should open the edit page for the edit action', () => {
      const editSpy = jest
        .spyOn(component, 'editAccount')
        .mockImplementation(() => undefined);

      component.onAccountCardAction(mockAccount, 'edit');

      expect(editSpy).toHaveBeenCalledWith(mockAccount);
    });

    it('should start deletion for the delete action', () => {
      const deleteSpy = jest
        .spyOn(component, 'deleteAccount')
        .mockImplementation(() => undefined);

      component.onAccountCardAction(mockAccount, 'delete');

      expect(deleteSpy).toHaveBeenCalledWith(mockAccount);
    });

    it('should ignore an unknown action', () => {
      const editSpy = jest
        .spyOn(component, 'editAccount')
        .mockImplementation(() => undefined);
      const deleteSpy = jest
        .spyOn(component, 'deleteAccount')
        .mockImplementation(() => undefined);

      component.onAccountCardAction(mockAccount, 'archive');

      expect(editSpy).not.toHaveBeenCalled();
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  it('should navigate to edit account page', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.editAccount(mockAccount);

    expect(navigateSpy).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Test~1234',
      'edit',
    ]);
  });

  it('should delete account', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);
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
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);

    component.deleteAccount(mockAccount);

    expect(stoAccountServiceSpy.deleteAccount).not.toHaveBeenCalled();
  });

  it('should set isLoading to false and log when delete account API fails', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);
    const err = new Error('delete failed');
    stoAccountServiceSpy.deleteAccount.mockReturnValue(throwError(() => err));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    component.deleteAccount(mockAccount);

    expect(stoAccountServiceSpy.deleteAccount).toHaveBeenCalledWith(
      mockAccount.id,
    );
    expect(component.isLoading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to delete STO account:',
      err,
    );
    consoleErrorSpy.mockRestore();
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
      expect(component.getPlatformIcon()).toBeNull();
    });

    it('should return null if platform not found', () => {
      expect(component.getPlatformIcon('missing')).toBeNull();
    });

    it('should return arc icon', () => {
      expect(component.getPlatformIcon('arc')).toEqual('fak fa-arc-games');
    });
    it('should return epic icon', () => {
      expect(component.getPlatformIcon('epic')).toEqual('fak fa-epic-games');
    });
    it('should return steam icon', () => {
      expect(component.getPlatformIcon('steam')).toEqual('fab fa-steam');
    });
    it('should return windows icon', () => {
      expect(component.getPlatformIcon('win')).toEqual('fab fa-windows');
    });
    it('should return playstation icon', () => {
      expect(component.getPlatformIcon('ps')).toEqual('fab fa-playstation');
    });
    it('should return xbox icon', () => {
      expect(component.getPlatformIcon('xbox')).toEqual('fab fa-xbox');
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
      expect(component.getLauncherIcon()).toBeNull();
    });

    it('should return null if launcher not found', () => {
      expect(component.getLauncherIcon('missing')).toBeNull();
    });

    it('should return arc icon', () => {
      expect(component.getLauncherIcon('arc')).toEqual('fak fa-arc-games');
    });

    it('should return epic icon', () => {
      expect(component.getLauncherIcon('epic')).toEqual('fak fa-epic-games');
    });

    it('should return steam icon', () => {
      expect(component.getLauncherIcon('steam')).toEqual('fab fa-steam');
    });

    it('should return null for unknown launcher', () => {
      expect(component.getLauncherIcon('unknown')).toBeNull();
    });
  });

  it('should get platform by id', () => {
    component.platforms = [{ id: 'p1', name: 'P1' } as Platform];
    expect(component.getPlatform('p1')).toBeDefined();
    expect(component.getPlatform('p2')).toBeUndefined();
    expect(component.getPlatform()).toBeUndefined();
  });

  it('should get launcher by id', () => {
    component.launchers = [{ id: 'l1', name: 'L1' } as Launcher];
    expect(component.getLauncher('l1')).toBeDefined();
    expect(component.getLauncher('l2')).toBeUndefined();
    expect(component.getLauncher()).toBeUndefined();
  });

  it('should get route link', () => {
    expect(component.getRouteLink('home')).toBe('test-link');
  });

  it('should build vm with username visibility and launcher class/background variants', () => {
    const account = {
      ...mockAccount,
      username: 'DifferentUser',
      platformId: 'pc',
      launcherId: 'arc',
      endeavourTotalNodes: 12,
    } as StoAccount;
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'pc', name: 'PC' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(
      of([{ id: 'arc', name: 'Arc' } as Launcher]),
    );

    component.ngOnInit();

    const vm = component.accountVms()[0];
    expect(vm.card.details.some(detail => detail.label === 'Username')).toBe(
      true,
    );
    expect(vm.card.themeClass).toBe('platform-pc launcher-arc');
    expect(vm.card.bgImagePath).toBe(
      '/assets/account-types/account_type_windows_arc.jpg',
    );
    expect(vm.card.endeavour?.totalNodes).toBe(12);
  });

  it('should omit the launcher theme class for non-pc platforms', () => {
    const account = {
      ...mockAccount,
      platformId: 'xbox',
      launcherId: 'steam',
    } as StoAccount;
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'xbox', name: 'Xbox' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(
      of([{ id: 'steam', name: 'Steam' } as Launcher]),
    );

    component.ngOnInit();
    expect(component.accountVms()[0].card.themeClass).toBe('platform-xbox');
    expect(component.accountVms()[0].card.bgImagePath).toBe(
      '/assets/account-types/account_type_xbox.jpg',
    );
  });

  it('should map platform classes for all known values and unknown', () => {
    component.platforms = [
      { id: 'ps', name: 'PlayStation' },
      { id: 'x', name: 'Xbox' },
      { id: 's', name: 'Steam' },
      { id: 'pc', name: 'PC' },
      { id: 'a', name: 'Arc' },
      { id: 'e', name: 'Epic' },
      { id: 'u', name: 'Unknown' },
    ] as Platform[];

    expect(component.getPlatformClass('ps')).toBe('platform-playstation');
    expect(component.getPlatformClass('x')).toBe('platform-xbox');
    expect(component.getPlatformClass('s')).toBe('platform-steam');
    expect(component.getPlatformClass('pc')).toBe('platform-pc');
    expect(component.getPlatformClass('a')).toBe('platform-arc');
    expect(component.getPlatformClass('e')).toBe('platform-epic');
    expect(component.getPlatformClass('u')).toBe('');
    expect(component.getPlatformClass('missing')).toBe('');
    expect(component.getPlatformClass()).toBe('');
  });

  it('should prefer API-provided accountTypeImageUrl for card background', () => {
    const cloudflareUrl =
      'https://cdn.startrekonline.info/cdn-cgi/imagedelivery/jQ0uSdJ3ty-KasNpXGxyuA/8ab52131-6f11-408a-d9df-3c1acaa46d00/public';

    const account = {
      ...mockAccount,
      accountTypeImageUrl: cloudflareUrl,
      platformId: 'pc',
      launcherId: 'steam',
    } as StoAccount;

    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'pc', name: 'Windows' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(
      of([{ id: 'steam', name: 'Steam' } as Launcher]),
    );

    component.ngOnInit();

    expect(component.accountVms()[0].card.bgImagePath).toBe(cloudflareUrl);
  });

  it('should use default windows background for pc account without launcher', () => {
    const account = {
      ...mockAccount,
      platformId: 'pc',
      launcherId: undefined,
    } as StoAccount;
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'pc', name: 'Windows' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of([]));

    component.ngOnInit();
    expect(component.accountVms()[0].card.bgImagePath).toBe(
      '/assets/account-types/account_type_windows_default.jpg',
    );
  });

  it('should use epic and steam background variants for pc launcher accounts', () => {
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'pc', name: 'PC' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(
      of([
        { id: 'epic', name: 'Epic' } as Launcher,
        { id: 'steam', name: 'Steam' } as Launcher,
      ]),
    );

    stoAccountServiceSpy.getAccounts.mockReturnValue(
      of([
        { ...mockAccount, platformId: 'pc', launcherId: 'epic' } as StoAccount,
      ]),
    );
    component.ngOnInit();
    expect(component.accountVms()[0].card.bgImagePath).toBe(
      '/assets/account-types/account_type_windows_epic.jpg',
    );

    stoAccountServiceSpy.getAccounts.mockReturnValue(
      of([
        { ...mockAccount, platformId: 'pc', launcherId: 'steam' } as StoAccount,
      ]),
    );
    component.loadAccounts();
    expect(component.accountVms()[0].card.bgImagePath).toBe(
      '/assets/account-types/account_type_windows_steam.jpg',
    );
  });

  it('should use default image path for unknown platform class', () => {
    const account = {
      ...mockAccount,
      platformId: 'unknown',
      launcherId: undefined,
    } as StoAccount;
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'unknown', name: 'Handheld' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of([]));

    component.ngOnInit();
    expect(component.accountVms()[0].card.bgImagePath).toBe(
      '/assets/account-types/account_type_default.jpg',
    );
  });

  it('should hide username when it matches handle case-insensitively', () => {
    const account = {
      ...mockAccount,
      username: 'test#1234',
      platformId: 'pc',
    } as StoAccount;
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([account]));
    stoAccountServiceSpy.getPlatforms.mockReturnValue(
      of([{ id: 'pc', name: 'PC' } as Platform]),
    );
    stoAccountServiceSpy.getLaunchers.mockReturnValue(of([]));

    component.ngOnInit();
    expect(
      component
        .accountVms()[0]
        .card.details.some(detail => detail.label === 'Username'),
    ).toBe(false);
  });

  it('should complete destroy stream on ngOnDestroy', () => {
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  describe('sorting, filtering and pinning', () => {
    const platforms: Platform[] = [
      {
        id: 'p1',
        name: 'Windows',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      {
        id: 'p2',
        name: 'Xbox',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
    ];

    const launchers: Launcher[] = [
      {
        id: 'l1',
        name: 'Steam',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      {
        id: 'l2',
        name: 'Epic',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
    ];

    const account = (overrides: Partial<StoAccount>): StoAccount => ({
      ...mockAccount,
      lifetimeSubscription: false,
      ...overrides,
    });

    /**
     * Loads the given accounts through the component, as the API would return
     * them.
     */
    const load = (accounts: StoAccount[]): void => {
      stoAccountServiceSpy.getAccounts.mockReturnValue(of(accounts));
      stoAccountServiceSpy.getPlatforms.mockReturnValue(of(platforms));
      stoAccountServiceSpy.getLaunchers.mockReturnValue(of(launchers));

      fixture.detectChanges();
    };

    const visibleHandles = (): string[] =>
      component.filteredAccountVms().map(vm => vm.account.handle);

    describe('the list controls', () => {
      it('should be offered once there is more than one account', () => {
        load([
          account({ id: '1', handle: 'Archer' }),
          account({ id: '2', handle: 'Sisko' }),
        ]);

        expect(component.showListControls()).toBe(true);
      });

      // Ordering one account and narrowing a list of one are both no-ops, so
      // the panels would only be clutter.
      it('should be withheld for a single account', () => {
        load([account({ id: '1', handle: 'Archer' })]);

        expect(component.showListControls()).toBe(false);
      });

      it('should be withheld when there are no accounts at all', () => {
        load([]);

        expect(component.showListControls()).toBe(false);
      });

      it('should render the filter and sort panels when offered', () => {
        load([
          account({ id: '1', handle: 'Archer' }),
          account({ id: '2', handle: 'Sisko' }),
        ]);

        expect(
          fixture.nativeElement.querySelector('#account-search-input'),
        ).toBeTruthy();
        expect(
          fixture.nativeElement.querySelector('#account-sort-by-select'),
        ).toBeTruthy();
      });

      it('should not render the panels for a single account', () => {
        load([account({ id: '1', handle: 'Archer' })]);

        expect(
          fixture.nativeElement.querySelector('#account-search-input'),
        ).toBeNull();
        expect(
          fixture.nativeElement.querySelector('#account-sort-by-select'),
        ).toBeNull();
      });
    });

    describe('sorting', () => {
      // The API does the ordering, so changing it has to go back for the list.
      it('should reload the list with the chosen field', () => {
        load([
          account({ id: '1', handle: 'Archer' }),
          account({ id: '2', handle: 'Sisko' }),
        ]);

        component.setSortBy('characterCount');

        expect(component.sortBy()).toBe('characterCount');
        expect(stoAccountServiceSpy.getAccounts).toHaveBeenLastCalledWith(
          'characterCount',
          'ASC',
        );
      });

      it('should reload the list with the chosen direction', () => {
        load([
          account({ id: '1', handle: 'Archer' }),
          account({ id: '2', handle: 'Sisko' }),
        ]);

        component.setSortOrder('DESC');

        expect(component.sortOrder()).toBe('DESC');
        expect(stoAccountServiceSpy.getAccounts).toHaveBeenLastCalledWith(
          'handle',
          'DESC',
        );
      });

      it('should ask for the default ordering on first load', () => {
        load([account({ id: '1', handle: 'Archer' })]);

        expect(stoAccountServiceSpy.getAccounts).toHaveBeenCalledWith(
          'handle',
          'ASC',
        );
      });

      // Ordering is the API's job, so the component must not reorder the rows
      // it is handed.
      it('should keep the order the API returned', () => {
        load([
          account({ id: '1', handle: 'Sisko' }),
          account({ id: '2', handle: 'Archer' }),
        ]);

        expect(visibleHandles()).toEqual(['Sisko', 'Archer']);
      });
    });

    describe('filtering', () => {
      beforeEach(() => {
        load([
          account({
            id: '1',
            handle: 'Archer',
            username: 'jonathan',
            platformId: 'p1',
            launcherId: 'l1',
            lifetimeSubscription: true,
          }),
          account({
            id: '2',
            handle: 'Sisko',
            email: 'ben@ds9.com',
            notes: 'baseball',
            platformId: 'p2',
            launcherId: 'l2',
          }),
        ]);
      });

      it('should match the handle', () => {
        component.searchText.set('arch');

        expect(visibleHandles()).toEqual(['Archer']);
      });

      it('should match the username', () => {
        component.searchText.set('jonathan');

        expect(visibleHandles()).toEqual(['Archer']);
      });

      it('should match the email', () => {
        component.searchText.set('ds9');

        expect(visibleHandles()).toEqual(['Sisko']);
      });

      it('should match the notes', () => {
        component.searchText.set('baseball');

        expect(visibleHandles()).toEqual(['Sisko']);
      });

      it('should filter by platform', () => {
        component.platformFilter.set('p2');

        expect(visibleHandles()).toEqual(['Sisko']);
      });

      it('should filter by launcher', () => {
        component.launcherFilter.set('l1');

        expect(visibleHandles()).toEqual(['Archer']);
      });

      it('should filter by lifetime subscription', () => {
        component.lifetimeOnly.set(true);

        expect(visibleHandles()).toEqual(['Archer']);
      });

      it('should count the filters that are narrowing the list', () => {
        component.searchText.set('a');
        component.platformFilter.set('p1');

        expect(component.activeFilterCount()).toBe(2);
      });

      it('should clear every filter', () => {
        component.searchText.set('arch');
        component.platformFilter.set('p1');
        component.launcherFilter.set('l1');
        component.lifetimeOnly.set(true);
        component.pinnedOnly.set(true);

        component.clearFilters();

        expect(component.activeFilterCount()).toBe(0);
        expect(visibleHandles()).toEqual(['Archer', 'Sisko']);
      });

      // Filtering is local, so narrowing the list must not go back to the API.
      it('should not reload the list when a filter changes', () => {
        stoAccountServiceSpy.getAccounts.mockClear();

        component.searchText.set('arch');

        expect(stoAccountServiceSpy.getAccounts).not.toHaveBeenCalled();
      });

      it('should report when every account has been filtered out', () => {
        component.searchText.set('nobody');

        expect(component.allAccountsFilteredOut()).toBe(true);
      });

      it('should not report an empty account list as filtered out', () => {
        load([]);

        expect(component.allAccountsFilteredOut()).toBe(false);
      });
    });

    // An account can be saved without a platform or launcher, and must then
    // simply fall outside a filter that names one.
    it('should exclude an account with no platform or launcher recorded', () => {
      load([
        account({ id: '1', handle: 'Archer', platformId: 'p1' }),
        account({
          id: '2',
          handle: 'Sisko',
          platformId: undefined,
          launcherId: undefined,
        }),
      ]);

      component.platformFilter.set('p1');
      expect(visibleHandles()).toEqual(['Archer']);

      component.clearFilters();
      component.launcherFilter.set('l1');
      expect(visibleHandles()).toEqual([]);
    });

    describe('pinning', () => {
      const pinnedAccount = account({
        id: '1',
        handle: 'Archer',
        pinnedAt: '2026-01-01T00:00:00Z',
      });
      const unpinnedAccount = account({ id: '2', handle: 'Sisko' });

      it('should offer a pin action on every card', () => {
        load([unpinnedAccount]);

        const pin = component
          .accountVms()[0]
          .card.actions.find(action => action.key === 'pin');

        expect(pin).toEqual({
          key: 'pin',
          icon: 'fas fa-thumbtack',
          title: 'Pin Account to Top',
          active: false,
        });
      });

      // Pinning stays available with one account: the choice keeps its meaning
      // as soon as a second account arrives.
      it('should offer the pin action even for a single account', () => {
        load([unpinnedAccount]);

        expect(component.showListControls()).toBe(false);
        expect(
          component
            .accountVms()[0]
            .card.actions.some(action => action.key === 'pin'),
        ).toBe(true);
      });

      it('should show a pinned account as engaged, offering to unpin it', () => {
        load([pinnedAccount]);

        const pin = component
          .accountVms()[0]
          .card.actions.find(action => action.key === 'pin');

        expect(pin?.active).toBe(true);
        expect(pin?.title).toBe('Unpin Account');
      });

      it('should pin an unpinned account', () => {
        load([pinnedAccount, unpinnedAccount]);

        component.onAccountCardAction(unpinnedAccount, 'pin');

        expect(stoAccountServiceSpy.setAccountPinned).toHaveBeenCalledWith(
          '2',
          true,
        );
      });

      it('should unpin a pinned account', () => {
        load([pinnedAccount, unpinnedAccount]);

        component.onAccountCardAction(pinnedAccount, 'pin');

        expect(stoAccountServiceSpy.setAccountPinned).toHaveBeenCalledWith(
          '1',
          false,
        );
      });

      // The new position comes from the API rather than being guessed at here.
      it('should reload the list after pinning', () => {
        load([pinnedAccount, unpinnedAccount]);
        stoAccountServiceSpy.getAccounts.mockClear();

        component.togglePin(unpinnedAccount);

        expect(stoAccountServiceSpy.getAccounts).toHaveBeenCalledTimes(1);
      });

      it('should stop loading and log when pinning fails', () => {
        load([pinnedAccount, unpinnedAccount]);
        const consoleSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        stoAccountServiceSpy.setAccountPinned.mockReturnValue(
          throwError(() => new Error('nope')),
        );

        component.togglePin(unpinnedAccount);

        expect(component.isLoading).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to update the STO account pin:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });

      it('should count the pinned accounts', () => {
        load([pinnedAccount, unpinnedAccount]);

        expect(component.pinnedCount()).toBe(1);
      });

      it('should filter down to the pinned accounts', () => {
        load([pinnedAccount, unpinnedAccount]);

        component.pinnedOnly.set(true);

        expect(visibleHandles()).toEqual(['Archer']);
      });

      it('should offer the pinned-only filter only once something is pinned', () => {
        load([unpinnedAccount, account({ id: '3', handle: 'Picard' })]);

        expect(component.pinnedCount()).toBe(0);
      });
    });

    it('should ignore an unrecognised card action', () => {
      load([account({ id: '1', handle: 'Archer' })]);

      component.onAccountCardAction(mockAccount, 'beam-up');

      expect(stoAccountServiceSpy.setAccountPinned).not.toHaveBeenCalled();
      expect(stoAccountServiceSpy.deleteAccount).not.toHaveBeenCalled();
    });
  });
});
