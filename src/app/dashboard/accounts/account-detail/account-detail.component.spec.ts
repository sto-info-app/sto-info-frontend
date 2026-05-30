import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Event, Params, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { EndeavourService } from 'src/app/dashboard/services/endeavour.service';
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
  let mockEndeavourService: jest.Mocked<Pick<EndeavourService, 'getSummary'>>;
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

    mockEndeavourService = {
      getSummary: jest.fn().mockReturnValue(
        of({
          totalNodes: 10,
          maxPossibleNodes: 100,
          overallCompletionPercentage: 10,
          maxedPerks: 1,
          totalPerks: 5,
          spaceNodes: 6,
          spaceMaxNodes: 50,
          spaceCompletionPercentage: 12,
          groundNodes: 4,
          groundMaxNodes: 50,
          groundCompletionPercentage: 8,
        }),
      ),
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
        { provide: EndeavourService, useValue: mockEndeavourService },
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
      expect(component.characters()).toEqual([mockCharacter]);
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

  describe('loadEndeavourSummary', () => {
    it('should set endeavour summary on success', () => {
      component.loadEndeavourSummary('acc1');
      expect(mockEndeavourService.getSummary).toHaveBeenCalledWith('acc1');
      expect(component.endeavourSummary()).not.toBeNull();
    });

    it('should fail silently on summary load error', () => {
      mockEndeavourService.getSummary.mockReturnValue(
        throwError(() => new Error('summary error')),
      );

      expect(() => component.loadEndeavourSummary('acc1')).not.toThrow();
      expect(component.endeavourSummary()).toBeNull();
    });
  });

  describe('editAccount', () => {
    it('should navigate to account edit page', () => {
      component.account = mockAccount;

      component.editAccount();

      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle(mockAccount.handle),
        'edit',
      ]);
    });

    it('should do nothing if account is null', () => {
      component.account = null;

      component.editAccount();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
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
      expect(component.getProfileImageUrl(char as Character)).toContain(
        'local/img.jpg',
      );
    });

    it('onProfileImageError should add id to failed set', () => {
      component.onProfileImageError('123');
      expect(component.failedImageIds.has('123')).toBe(true);
    });

    it('filteredVms should use unavailablePhotoSrc when image has failed', () => {
      component.characters.set([mockCharacter]);
      component.onProfileImageError(mockCharacter.id);
      const vm = component.filteredVms().find(v => v.id === mockCharacter.id);
      expect(vm?.imageUrl).toBe(SRC_PHOTO_UNAVAILABLE_100PX);
    });
  });

  describe('Filter getters', () => {
    const charWithRank: Character = {
      ...mockCharacter,
      rank: { title: 'Admiral', levelRange: '60-65' },
      species: { id: 'sp1', name: 'Human' },
      faction: { id: 'f1', name: 'Starfleet', generalFactionId: 'fed' },
      generalFaction: { id: 'fed', name: 'Federation' },
      recruitType: { id: 'rt1', name: 'Normal' },
    };

    const charKlingon: Character = {
      ...mockCharacter,
      id: 'char2',
      handle: 'Klang',
      sex: { id: 'f', name: 'Female' },
      class: { id: 'sci', name: 'Science' },
      rank: { title: 'General', levelRange: '50-59' },
      species: { id: 'sp2', name: 'Klingon' },
      faction: { id: 'f2', name: 'KDF', generalFactionId: 'kdf' },
      generalFaction: { id: 'kdf', name: 'Klingon Empire' },
      recruitType: { id: 'rt2', name: 'Delta Recruit' },
    };

    beforeEach(() => {
      component.characters.set([charWithRank, charKlingon]);
    });

    describe('uniqueRanks', () => {
      it('should return sorted unique rank level ranges', () => {
        expect(component.uniqueRanks()).toEqual(['50-59', '60-65']);
      });

      it('should exclude characters without rank', () => {
        component.characters.set([
          { ...mockCharacter, rank: undefined },
          charWithRank,
        ]);
        expect(component.uniqueRanks()).toEqual(['60-65']);
      });
    });

    describe('uniqueSpecies', () => {
      it('should return sorted unique species names', () => {
        expect(component.uniqueSpecies()).toEqual(['Human', 'Klingon']);
      });

      it('should exclude characters without species', () => {
        component.characters.set([
          { ...mockCharacter, species: undefined },
          charWithRank,
        ]);
        expect(component.uniqueSpecies()).toEqual(['Human']);
      });
    });

    describe('uniqueFactions', () => {
      it('should return sorted unique faction names', () => {
        expect(component.uniqueFactions()).toEqual(['KDF', 'Starfleet']);
      });
    });

    describe('uniqueGeneralFactions', () => {
      it('should return sorted unique general faction names', () => {
        expect(component.uniqueGeneralFactions()).toEqual([
          'Federation',
          'Klingon Empire',
        ]);
      });
    });

    describe('uniqueSexes', () => {
      it('should return sorted unique sex names', () => {
        expect(component.uniqueSexes()).toEqual(['Female', 'Male']);
      });

      it('should exclude characters without sex', () => {
        component.characters.set([
          { ...mockCharacter, sex: undefined },
          { ...charKlingon },
        ]);
        expect(component.uniqueSexes()).toEqual(['Female']);
      });
    });

    describe('uniqueClasses', () => {
      it('should return sorted unique class names', () => {
        expect(component.uniqueClasses()).toEqual(['Science', 'Tactical']);
      });

      it('should exclude characters without class', () => {
        component.characters.set([
          { ...mockCharacter, class: undefined },
          charKlingon,
        ]);
        expect(component.uniqueClasses()).toEqual(['Science']);
      });
    });

    describe('uniqueRecruitTypes', () => {
      it('should return sorted unique recruit type names', () => {
        expect(component.uniqueRecruitTypes()).toEqual([
          'Delta Recruit',
          'Normal',
        ]);
      });
    });
  });

  describe('filteredCharacters', () => {
    const charWithRank: Character = {
      ...mockCharacter,
      rank: { title: 'Admiral', levelRange: '60-65' },
      species: { id: 'sp1', name: 'Human' },
      faction: { id: 'f1', name: 'Starfleet', generalFactionId: 'fed' },
      generalFaction: { id: 'fed', name: 'Federation' },
      recruitType: { id: 'rt1', name: 'Normal' },
    };

    const charKlingon: Character = {
      ...mockCharacter,
      id: 'char2',
      handle: 'Klang',
      firstName: 'Bat',
      lastName: 'Leth',
      sex: { id: 'f', name: 'Female' },
      class: { id: 'sci', name: 'Science' },
      rank: { title: 'General', levelRange: '50-59' },
      species: { id: 'sp2', name: 'Klingon' },
      faction: { id: 'f2', name: 'KDF', generalFactionId: 'kdf' },
      generalFaction: { id: 'kdf', name: 'Klingon Empire' },
      recruitType: { id: 'rt2', name: 'Delta Recruit' },
    };

    beforeEach(() => {
      component.characters.set([charWithRank, charKlingon]);
      component.searchText.set('');
      component.filterRank.set('');
      component.filterSpecies.set('');
      component.filterFaction.set('');
      component.filterGeneralFaction.set('');
      component.filterSex.set('');
      component.filterClass.set('');
      component.filterRecruitType.set('');
    });

    it('should return all characters when no filters active', () => {
      expect(component.filteredCharacters().length).toBe(2);
    });

    it('should filter by searchText matching handle', () => {
      component.searchText.set('Klang');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by searchText matching firstName', () => {
      component.searchText.set('bat');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by searchText matching lastName', () => {
      component.searchText.set('leth');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should return empty when searchText matches nothing', () => {
      component.searchText.set('zzznomatch');
      expect(component.filteredCharacters()).toEqual([]);
    });

    it('should filter by rank', () => {
      component.filterRank.set('60-65');
      expect(component.filteredCharacters()).toEqual([charWithRank]);
    });

    it('should filter by species', () => {
      component.filterSpecies.set('Klingon');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by faction', () => {
      component.filterFaction.set('Starfleet');
      expect(component.filteredCharacters()).toEqual([charWithRank]);
    });

    it('should filter by general faction', () => {
      component.filterGeneralFaction.set('Klingon Empire');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by sex', () => {
      component.filterSex.set('Female');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by class', () => {
      component.filterClass.set('Science');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should filter by recruit type', () => {
      component.filterRecruitType.set('Delta Recruit');
      expect(component.filteredCharacters()).toEqual([charKlingon]);
    });

    it('should combine multiple filters', () => {
      component.filterSpecies.set('Human');
      component.filterRank.set('50-59');
      expect(component.filteredCharacters()).toEqual([]);
    });
  });

  describe('activeFilterCount', () => {
    beforeEach(() => {
      component.searchText.set('');
      component.filterRank.set('');
      component.filterSpecies.set('');
      component.filterFaction.set('');
      component.filterGeneralFaction.set('');
      component.filterSex.set('');
      component.filterClass.set('');
      component.filterRecruitType.set('');
    });

    it('should return 0 when no filters active', () => {
      expect(component.activeFilterCount()).toBe(0);
    });

    it('should count each active filter', () => {
      component.searchText.set('x');
      expect(component.activeFilterCount()).toBe(1);
      component.filterRank.set('x');
      expect(component.activeFilterCount()).toBe(2);
      component.filterSpecies.set('x');
      expect(component.activeFilterCount()).toBe(3);
      component.filterFaction.set('x');
      expect(component.activeFilterCount()).toBe(4);
      component.filterGeneralFaction.set('x');
      expect(component.activeFilterCount()).toBe(5);
      component.filterSex.set('x');
      expect(component.activeFilterCount()).toBe(6);
      component.filterClass.set('x');
      expect(component.activeFilterCount()).toBe(7);
      component.filterRecruitType.set('x');
      expect(component.activeFilterCount()).toBe(8);
    });
  });

  describe('clearFilters', () => {
    it('should reset all filter signals to empty strings', () => {
      component.searchText.set('something');
      component.filterRank.set('Admiral');
      component.filterSpecies.set('Human');
      component.filterFaction.set('Starfleet');
      component.filterGeneralFaction.set('Federation');
      component.filterSex.set('Male');
      component.filterClass.set('Tactical');
      component.filterRecruitType.set('Normal');

      component.clearFilters();

      expect(component.searchText()).toBe('');
      expect(component.filterRank()).toBe('');
      expect(component.filterSpecies()).toBe('');
      expect(component.filterFaction()).toBe('');
      expect(component.filterGeneralFaction()).toBe('');
      expect(component.filterSex()).toBe('');
      expect(component.filterClass()).toBe('');
      expect(component.filterRecruitType()).toBe('');
    });
  });
});
