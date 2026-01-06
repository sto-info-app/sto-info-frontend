import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Event, Params, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import {
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  SRC_PHOTO_UNAVAILABLE_100PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { AccountDetailComponent } from './account-detail.component';

describe('AccountDetailComponent', () => {
  let component: AccountDetailComponent;
  let fixture: ComponentFixture<AccountDetailComponent>;
  let mockRouter: jest.Mocked<
    Pick<Router, 'navigate' | 'createUrlTree' | 'serializeUrl' | 'events'>
  >;
  let mockStoAccountService: jest.Mocked<
    Pick<StoAccountService, 'getAccounts' | 'getAccount'>
  >;
  let mockCharacterService: jest.Mocked<
    Pick<CharacterService, 'getCharactersByAccount' | 'deleteCharacter'>
  >;
  let mockDialog: jest.Mocked<
    Pick<MatDialog, 'open' | 'closeAll' | 'afterOpened' | 'afterAllClosed'>
  >;
  let routeParamsSubject: Subject<Params>;

  const mockAccount = {
    id: 'acc1',
    userId: 'user1',
    handle: 'Test#1234',
    platformId: 'pc',
    accountCreatedDate: '2023-01-01',
    notes: 'Test notes',
    platform: { id: 'pc', name: 'PC' },
    publiclyVisible: true,
    lifetimeSubscription: false,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  } as unknown as StoAccount;

  const mockCharacter: Character = {
    id: 'char1',
    userId: 'user1',
    accountId: 'acc1',
    handle: 'Char1',
    sexId: 'male',
    sex: { id: 'male', name: 'Male' },
    classId: 'tac',
    class: { id: 'tac', name: 'Tactical' },
    generalFactionId: 'fed',
    generalFaction: { id: 'fed', name: 'Federation' },
    level: 65,
    profilePicture: 'img1',
    profilePicture100: 'img1-100',
    profilePicture300: 'img1-300',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    recruitTypeId: 'rt1',
    speciesId: 'sp1',
    factionId: 'fed',
  };

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn(),
      createUrlTree: jest.fn(),
      serializeUrl: jest.fn(),
      events: new Subject<Event>(),
    };

    mockStoAccountService = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
      getAccount: jest.fn().mockReturnValue(of(mockAccount)),
    };

    mockCharacterService = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
      deleteCharacter: jest.fn().mockReturnValue(of(void 0)),
    };

    mockDialog = {
      open: jest.fn(),
      closeAll: jest.fn(),
      afterOpened: new Subject<MatDialogRef<unknown, unknown>>(),
      afterAllClosed: new Subject<void>(),
    };

    routeParamsSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [AccountDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: StoAccountService, useValue: mockStoAccountService },
        { provide: CharacterService, useValue: mockCharacterService },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParamsSubject.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AccountDetailComponent, {
        set: {
          providers: [{ provide: MatDialog, useValue: mockDialog }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountDetailComponent);
    component = fixture.componentInstance;
    // Do not auto detect changes to control params emission
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load account data when handle param is present', () => {
      fixture.detectChanges();
      const encodedHandle = encodeStoHandle(mockAccount.handle);
      routeParamsSubject.next({ handle: encodedHandle });

      expect(mockStoAccountService.getAccounts).toHaveBeenCalled();
      expect(component.account).toEqual(mockAccount);
    });

    it('should not load account data if handle param is missing', () => {
      fixture.detectChanges();
      routeParamsSubject.next({});
      expect(mockStoAccountService.getAccounts).not.toHaveBeenCalled();
    });
  });

  describe('loadAccountData', () => {
    it('should set error message if account not found', () => {
      mockStoAccountService.getAccounts.mockReturnValue(of([]));
      component.loadAccountData(mockAccount.handle);
      expect(component.errorMessage).toBe('Account not found');
      expect(component.isLoading).toBe(false);
    });

    it('should handle error when fetching accounts fails', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockStoAccountService.getAccounts.mockReturnValue(
        throwError(() => new Error('Error')),
      );
      component.loadAccountData(mockAccount.handle);
      expect(component.errorMessage).toBe('Failed to load account details');
      expect(component.isLoading).toBe(false);
      spy.mockRestore();
    });
  });

  describe('loadCharacters', () => {
    it('should load characters successfully', () => {
      component.loadCharacters('acc1');
      expect(mockCharacterService.getCharactersByAccount).toHaveBeenCalledWith(
        'acc1',
      );
      expect(component.characters).toEqual([mockCharacter]);
      expect(component.isLoading).toBe(false);
    });

    it('should handle error when fetching characters fails', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        throwError(() => new Error('Error')),
      );
      component.loadCharacters('acc1');
      expect(component.errorMessage).toBe('Failed to load characters');
      expect(component.isLoading).toBe(false);
      spy.mockRestore();
    });
  });

  describe('editAccount', () => {
    it('should open dialog and update account on success', () => {
      component.account = mockAccount;
      const updatedAccount = { ...mockAccount, notes: 'Updated' };
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);
      mockStoAccountService.getAccount.mockReturnValue(of(updatedAccount));

      component.editAccount();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockStoAccountService.getAccount).toHaveBeenCalledWith(
        mockAccount.id,
      );
      expect(component.account).toEqual(updatedAccount);
    });

    it('should navigate if handle changed', () => {
      component.account = mockAccount;
      const updatedAccount = { ...mockAccount, handle: 'New#9999' };
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);
      mockStoAccountService.getAccount.mockReturnValue(of(updatedAccount));

      component.editAccount();

      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle(updatedAccount.handle),
      ]);
    });

    it('should do nothing if account is null', () => {
      component.account = null;
      component.editAccount();
      expect(mockDialog.open).not.toHaveBeenCalled();
    });

    it('should handle editAccount where updated account returns null', () => {
      component.account = mockAccount;
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);
      mockStoAccountService.getAccount.mockReturnValue(
        of(null as unknown as StoAccount),
      );

      component.editAccount();

      expect(mockStoAccountService.getAccount).toHaveBeenCalledWith(
        mockAccount.id,
      );
      // Account should not change from existing mockAccount to null
      expect(component.account).toEqual(mockAccount);
    });

    it('should not update if account becomes null while dialog is open', () => {
      component.account = mockAccount;
      // Simulate dialog closing with true, but account becoming null in between
      mockDialog.open.mockImplementation(() => {
        return {
          afterClosed: () => {
            component.account = null;
            return of(true);
          },
        } as unknown as MatDialogRef<unknown, unknown>;
      });

      component.editAccount();

      expect(mockDialog.open).toHaveBeenCalled();
      // Should NOT call getAccount because this.account is null
      expect(mockStoAccountService.getAccount).not.toHaveBeenCalled();
    });
  });

  describe('addCharacter', () => {
    it('should navigate to add character page', () => {
      component.account = mockAccount;
      component.addCharacter();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle(mockAccount.handle),
        'characters',
        'add',
      ]);
    });

    it('should do nothing if account is null', () => {
      component.account = null;
      component.addCharacter();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('editCharacter', () => {
    it('should navigate to edit character page', () => {
      component.account = mockAccount;
      component.editCharacter(mockCharacter);
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle(mockAccount.handle),
        mockCharacter.handle,
        'edit',
      ]);
    });

    it('should do nothing if account is null', () => {
      component.account = null;
      component.editCharacter(mockCharacter);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('deleteCharacter', () => {
    it('should open confirm dialog and delete character on confirmation', () => {
      component.account = mockAccount;
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);

      component.deleteCharacter(mockCharacter);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockCharacterService.deleteCharacter).toHaveBeenCalledWith(
        mockCharacter.id,
      );
      // Should reload characters
      expect(mockCharacterService.getCharactersByAccount).toHaveBeenCalledWith(
        mockAccount.id,
      );
    });

    it('should not reload characters if account is null after delete', () => {
      component.account = null;
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);

      component.deleteCharacter(mockCharacter);

      expect(mockCharacterService.deleteCharacter).toHaveBeenCalled();
      expect(
        mockCharacterService.getCharactersByAccount,
      ).not.toHaveBeenCalled();
    });

    it('should not delete if dialog cancelled', () => {
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(false),
      } as MatDialogRef<unknown, unknown>);

      component.deleteCharacter(mockCharacter);

      expect(mockCharacterService.deleteCharacter).not.toHaveBeenCalled();
    });

    it('should handle error on delete', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<unknown, unknown>);
      mockCharacterService.deleteCharacter.mockReturnValue(
        throwError(() => new Error('Error')),
      );

      component.deleteCharacter(mockCharacter);

      expect(spy).toHaveBeenCalledWith(
        'Failed to delete character',
        expect.any(Error),
      );
      spy.mockRestore();
    });
  });

  describe('Helper methods', () => {
    it('getCharacterLink should return correct array', () => {
      component.account = mockAccount;
      const link = component.getCharacterLink(mockCharacter);
      expect(link).toEqual([
        '/dashboard/accounts',
        encodeStoHandle(mockAccount.handle),
        mockCharacter.handle,
      ]);
    });

    it('getCharacterLink should handle null account', () => {
      component.account = null;
      const link = component.getCharacterLink(mockCharacter);
      expect(link).toEqual([
        '/dashboard/accounts',
        '', // encodeStoHandle('') returns ''
        mockCharacter.handle,
      ]);
    });

    it('getRouteLink should prepend slash', () => {
      expect(component.getRouteLink('test')).toBe('/test');
    });

    it('getFactionClass should return formatted faction name', () => {
      expect(component.getFactionClass(mockCharacter)).toBe('federation');
      expect(
        component.getFactionClass({
          ...mockCharacter,
          generalFaction: { id: 'x', name: 'Alien Domain' },
        } as Character),
      ).toBe('alien-domain');
      expect(
        component.getFactionClass({
          ...mockCharacter,
          generalFaction: undefined,
        } as Character),
      ).toBe('unknown');
      expect(
        component.getFactionClass({
          ...mockCharacter,
          generalFaction: { id: 'x', name: undefined },
        } as unknown as Character),
      ).toBe('unknown');
    });

    it('getClassCategory should return correct class category', () => {
      expect(component.getClassCategory(mockCharacter)).toBe('tactical');
      expect(
        component.getClassCategory({
          ...mockCharacter,
          class: { id: 'eng', name: 'Engineering' },
        } as Character),
      ).toBe('engineering');
      expect(
        component.getClassCategory({
          ...mockCharacter,
          class: { id: 'sci', name: 'Science' },
        } as Character),
      ).toBe('science');
      expect(
        component.getClassCategory({
          ...mockCharacter,
          class: { id: 'unk', name: 'Unknown' },
        } as Character),
      ).toBe('unknown');
      expect(
        component.getClassCategory({
          ...mockCharacter,
          class: undefined,
        } as Character),
      ).toBe('unknown');
    });

    it('getSexIcon should return correct icon name', () => {
      expect(component.getSexIcon(mockCharacter)).toBe('mars'); // male
      expect(
        component.getSexIcon({
          ...mockCharacter,
          sex: { id: 'f', name: 'Female' },
        } as Character),
      ).toBe('venus');
      expect(
        component.getSexIcon({
          ...mockCharacter,
          sex: { id: 'u', name: 'Unknown' },
        } as Character),
      ).toBe('circle-question');
      expect(
        component.getSexIcon({
          ...mockCharacter,
          sex: undefined,
        } as Character),
      ).toBe('circle-question');
    });
  });

  describe('Image Handling', () => {
    it('getProfileImageUrl should return failed src if id is in failed set', () => {
      component.failedImageIds.add(mockCharacter.id);
      expect(component.getProfileImageUrl(mockCharacter)).toBe(
        SRC_PHOTO_UNAVAILABLE_100PX,
      );
    });

    it('getProfileImageUrl should return 100px variant if available', () => {
      const url = component.getProfileImageUrl(mockCharacter);
      // logic: if starts with http, return it. else if not local, append base + variant
      // mockCharacter.profilePicture100 = 'img1-100'
      // It does NOT start with http/local.
      expect(url).toContain('img1-100');
      expect(url).toContain(CLOUDFLARE_VARIANT_SQUARE_100PX_NAME);
    });

    it('getProfileImageUrl should fall back to 300px if 100px missing', () => {
      const char = { ...mockCharacter, profilePicture100: undefined };
      const url = component.getProfileImageUrl(char as Character);
      expect(url).toContain('img1-300');
    });

    it('getProfileImageUrl should fall back to original profilePicture if 100 and 300 missing', () => {
      const char = {
        ...mockCharacter,
        profilePicture100: undefined,
        profilePicture300: undefined,
      };
      const url = component.getProfileImageUrl(char as Character);
      expect(url).toContain('img1');
      expect(url).not.toContain('img1-300');
    });

    it('getProfileImageUrl should return unavailableSrc if all profile images missing', () => {
      const char = {
        ...mockCharacter,
        profilePicture100: undefined,
        profilePicture300: undefined,
        profilePicture: undefined,
      };
      const url = component.getProfileImageUrl(char as Character);
      expect(url).toBe(SRC_PHOTO_UNAVAILABLE_100PX);
    });

    it('getProfileImageUrl should handle full http urls', () => {
      const char = {
        ...mockCharacter,
        profilePicture100: 'http://example.com/img.jpg',
      };
      expect(component.getProfileImageUrl(char as Character)).toBe(
        'http://example.com/img.jpg',
      );
    });

    it('getProfileImageUrl should handle local/ paths', () => {
      const char = { ...mockCharacter, profilePicture100: 'local/img.jpg' };
      // logic checks for startWith local/ and prepends R2 url
      expect(component.getProfileImageUrl(char as Character)).toContain(
        'local/img.jpg',
      );
    });

    it('onProfileImageError should add id to failed set', () => {
      component.onProfileImageError('123');
      expect(component.failedImageIds.has('123')).toBe(true);
    });
  });
});
