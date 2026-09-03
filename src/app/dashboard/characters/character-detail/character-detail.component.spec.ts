import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  ActivatedRoute,
  Router,
  Event as RouterEvent,
  ParamMap,
  convertToParamMap,
} from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_R2_PUBLIC_URL,
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
  SRC_PHOTO_UNAVAILABLE_300PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { CharacterPicComponent } from '../dialogs/character-pic/character-pic.component';
import { CharacterDetailComponent } from './character-detail.component';

describe('CharacterDetailComponent', () => {
  let component: CharacterDetailComponent;
  let fixture: ComponentFixture<CharacterDetailComponent>;
  let mockCharacterService: jest.Mocked<CharacterService>;
  let mockStoAccountService: jest.Mocked<StoAccountService>;
  let mockRouter: Partial<Router>;
  let mockDialog: jest.Mocked<MatDialog>;
  let routeParamsSubject: BehaviorSubject<Record<string, string>>;
  let routeQueryParamsSubject: BehaviorSubject<ParamMap>;

  const mockAccount: StoAccount = {
    id: 'acc-1',
    handle: 'TestAccount',
    platformId: 'pc',
  } as StoAccount;

  const mockCharacter: Character = {
    id: 'char-1',
    handle: 'TestChar',
    accountId: 'acc-1',
    publiclyVisible: true,
    profilePicture: 'img-123',
    profilePicture300: 'img-123-300',
    generalFactionId: 'general-fed',
    factionId: 'fed',
    sexId: 'male',
    classId: 'tactical',
    recruitTypeId: 'standard',
    speciesId: 'human',
    level: 65,
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockCharacterService = {
      getCharactersByAccount: jest.fn(),
      getCharacter: jest.fn(),
    } as unknown as jest.Mocked<CharacterService>;

    mockStoAccountService = {
      getAccounts: jest.fn(),
    } as unknown as jest.Mocked<StoAccountService>;

    mockRouter = {
      navigate: jest.fn(),
      createUrlTree: jest.fn(),
      serializeUrl: jest.fn(),
      events: new BehaviorSubject<RouterEvent>(null as unknown as RouterEvent),
    };

    mockDialog = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    routeParamsSubject = new BehaviorSubject<Record<string, string>>({});
    routeQueryParamsSubject = new BehaviorSubject<ParamMap>(
      convertToParamMap({}),
    );

    await TestBed.configureTestingModule({
      imports: [CharacterDetailComponent, MatButtonModule, LoadingBarComponent],
      providers: [
        { provide: CharacterService, useValue: mockCharacterService },
        { provide: StoAccountService, useValue: mockStoAccountService },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeParamsSubject.asObservable(),
            queryParamMap: routeQueryParamsSubject.asObservable(),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CharacterDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit / character loading', () => {
    it('should stop loading and show an error when route params are missing', fakeAsync(() => {
      fixture.detectChanges();
      routeParamsSubject.next({});
      tick();

      expect(mockStoAccountService.getAccounts).not.toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('Invalid character link');
    }));

    it('should load character successfully', fakeAsync(() => {
      mockStoAccountService.getAccounts.mockReturnValue(of([mockAccount]));
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        of([mockCharacter]),
      );
      mockCharacterService.getCharacter.mockReturnValue(of(mockCharacter));

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.character).toEqual(mockCharacter);
      expect(component.isLoading).toBe(false);
      expect(mockStoAccountService.getAccounts).toHaveBeenCalled();
      expect(mockCharacterService.getCharactersByAccount).toHaveBeenCalledWith(
        'acc-1',
      );
      expect(mockCharacterService.getCharacter).toHaveBeenCalledWith('char-1');
    }));

    it('should handle account loading error', fakeAsync(() => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockStoAccountService.getAccounts.mockReturnValue(
        throwError(() => new Error('API Error')),
      );

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Failed to load account');
      expect(component.isLoading).toBe(false);
      consoleSpy.mockRestore();
    }));

    it('should handle account not found', fakeAsync(() => {
      mockStoAccountService.getAccounts.mockReturnValue(of([]));

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Account not found');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle character list loading error', fakeAsync(() => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockStoAccountService.getAccounts.mockReturnValue(of([mockAccount]));
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        throwError(() => new Error('API Error')),
      );

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Failed to load account characters');
      expect(component.isLoading).toBe(false);
      consoleSpy.mockRestore();
    }));

    it('should handle character not found in list', fakeAsync(() => {
      mockStoAccountService.getAccounts.mockReturnValue(of([mockAccount]));
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        of([{ ...mockCharacter, handle: 'OtherChar' } as Character]),
      );

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Character not found');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle full character details loading error', fakeAsync(() => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockStoAccountService.getAccounts.mockReturnValue(of([mockAccount]));
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        of([mockCharacter]),
      );
      mockCharacterService.getCharacter.mockReturnValue(
        throwError(() => new Error('Details Error')),
      );

      fixture.detectChanges();
      routeParamsSubject.next({
        handle: 'TestAccount',
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Failed to load character details');
      expect(component.isLoading).toBe(false);
      consoleSpy.mockRestore();
    }));
  });

  describe('Navigation', () => {
    beforeEach(() => {
      component.accountHandle = 'TestAccount';
      component.character = mockCharacter;
    });

    it('should navigate to edit page', () => {
      component.editCharacter();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
        'TestChar',
        'edit',
      ]);
    });

    it('should not navigate to edit if character is null', () => {
      component.character = null;
      component.editCharacter();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should get account link', () => {
      expect(component.getAccountLink()).toEqual([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
      ]);
    });

    it('should get route link', () => {
      expect(component.getRouteLink('test')).toBe('/test');
    });
  });

  describe('Tabs', () => {
    it('should default to the overview tab', () => {
      expect(component.activeTab()).toBe('overview');
      expect(component.reputationsOpened()).toBe(false);
    });

    it('should switch to the reputations tab and mark it opened', () => {
      component.selectTab('reputations');

      expect(component.activeTab()).toBe('reputations');
      expect(component.reputationsOpened()).toBe(true);
    });

    it('should reflect the reputations tab in the URL query params', () => {
      component.selectTab('reputations');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: 'reputations' } }),
      );
    });

    it('should clear the tab query param when returning to overview', () => {
      component.selectTab('overview');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: null } }),
      );
    });

    it('should keep the reputations tab mounted after switching back', () => {
      component.selectTab('reputations');
      component.selectTab('overview');

      expect(component.activeTab()).toBe('overview');
      expect(component.reputationsOpened()).toBe(true);
    });

    it('should switch to the R&D tab and mark it opened', () => {
      component.selectTab('rd');

      expect(component.activeTab()).toBe('rd');
      expect(component.rdOpened()).toBe(true);
    });

    it('should reflect the R&D tab in the URL query params', () => {
      component.selectTab('rd');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: 'rd' } }),
      );
    });

    it('should keep the R&D tab mounted after switching back', () => {
      component.selectTab('rd');
      component.selectTab('overview');

      expect(component.activeTab()).toBe('overview');
      expect(component.rdOpened()).toBe(true);
    });

    it('should activate the R&D tab named in the URL on load (deep link)', fakeAsync(() => {
      fixture.detectChanges();
      routeQueryParamsSubject.next(convertToParamMap({ tab: 'rd' }));
      tick();

      expect(component.activeTab()).toBe('rd');
      expect(component.rdOpened()).toBe(true);
    }));

    it('should switch to the specializations tab and mark it opened', () => {
      component.selectTab('specializations');

      expect(component.activeTab()).toBe('specializations');
      expect(component.specializationsOpened()).toBe(true);
    });

    it('should reflect the specializations tab in the URL query params', () => {
      component.selectTab('specializations');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: 'specializations' } }),
      );
    });

    it('should keep the specializations tab mounted after switching back', () => {
      component.selectTab('specializations');
      component.selectTab('overview');

      expect(component.activeTab()).toBe('overview');
      expect(component.specializationsOpened()).toBe(true);
    });

    it('should activate the specializations tab named in the URL on load (deep link)', fakeAsync(() => {
      fixture.detectChanges();
      routeQueryParamsSubject.next(
        convertToParamMap({ tab: 'specializations' }),
      );
      tick();

      expect(component.activeTab()).toBe('specializations');
      expect(component.specializationsOpened()).toBe(true);
    }));

    it('should switch to the Admiralty tab and mark it opened', () => {
      component.selectTab('admiralty');

      expect(component.activeTab()).toBe('admiralty');
      expect(component.admiraltyOpened()).toBe(true);
    });

    it('should reflect the Admiralty tab in the URL query params', () => {
      component.selectTab('admiralty');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: 'admiralty' } }),
      );
    });

    it('should keep the Admiralty tab mounted after switching back', () => {
      component.selectTab('admiralty');
      component.selectTab('overview');

      expect(component.activeTab()).toBe('overview');
      expect(component.admiraltyOpened()).toBe(true);
    });

    it('should activate the Admiralty tab named in the URL on load (deep link)', fakeAsync(() => {
      fixture.detectChanges();
      routeQueryParamsSubject.next(convertToParamMap({ tab: 'admiralty' }));
      tick();

      expect(component.activeTab()).toBe('admiralty');
      expect(component.admiraltyOpened()).toBe(true);
    }));

    it('should activate the tab named in the URL on load (deep link)', fakeAsync(() => {
      fixture.detectChanges();
      routeQueryParamsSubject.next(convertToParamMap({ tab: 'reputations' }));
      tick();

      expect(component.activeTab()).toBe('reputations');
      expect(component.reputationsOpened()).toBe(true);
    }));

    it('should fall back to overview for an unknown tab query param', fakeAsync(() => {
      fixture.detectChanges();
      routeQueryParamsSubject.next(convertToParamMap({ tab: 'bogus' }));
      tick();

      expect(component.activeTab()).toBe('overview');
    }));
  });

  describe('Photo Dialog', () => {
    beforeEach(() => {
      component.accountHandle = 'TestAccount';
      component.character = mockCharacter;
    });

    it('should open dialog and reload data on success', fakeAsync(() => {
      const dialogRefMock = {
        afterClosed: jest.fn().mockReturnValue(of(true)),
      };
      mockDialog.open.mockReturnValue(
        dialogRefMock as Partial<
          MatDialogRef<CharacterPicComponent>
        > as MatDialogRef<CharacterPicComponent>,
      );
      mockCharacterService.getCharacter.mockReturnValue(of(mockCharacter));

      component.editCharacterPhoto();
      tick();

      expect(mockDialog.open).toHaveBeenCalledWith(
        CharacterPicComponent,
        expect.objectContaining({
          data: { character: mockCharacter },
        }),
      );
      expect(mockCharacterService.getCharacter).toHaveBeenCalledWith('char-1');
    }));

    it('should not open dialog if character is null', () => {
      component.character = null;
      component.editCharacterPhoto();
      expect(mockDialog.open).not.toHaveBeenCalled();
    });

    it('should not reload data if dialog cancelled', fakeAsync(() => {
      const dialogRefMock = {
        afterClosed: jest.fn().mockReturnValue(of(false)), // cancelled
      };
      mockDialog.open.mockReturnValue(
        dialogRefMock as Partial<
          MatDialogRef<CharacterPicComponent>
        > as MatDialogRef<CharacterPicComponent>,
      );

      component.editCharacterPhoto();
      tick();

      expect(mockCharacterService.getCharacter).not.toHaveBeenCalled();
    }));

    it('should handle getCharacter error after dialog closes successfully', fakeAsync(() => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const dialogRefMock = {
        afterClosed: jest.fn().mockReturnValue(of(true)),
      };
      mockDialog.open.mockReturnValue(
        dialogRefMock as Partial<
          MatDialogRef<CharacterPicComponent>
        > as MatDialogRef<CharacterPicComponent>,
      );
      mockCharacterService.getCharacter.mockReturnValue(
        throwError(() => new Error('Photo load error')),
      );

      component.editCharacterPhoto();
      tick();

      expect(component.isLoading).toBe(false);
      consoleSpy.mockRestore();
    }));
  });

  describe('Image Handling', () => {
    beforeEach(() => {
      component.character = mockCharacter;
    });

    it('should return unavailable src if image failed', () => {
      component.onProfileImageError();
      expect(component.getProfileImageUrl()).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
    });

    it('should return unavailable src if character is null', () => {
      component.character = null;
      expect(component.getProfileImageUrl()).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
    });

    it('should return formatted 300px image if available', () => {
      expect(component.getProfileImageUrl()).toContain(
        CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
      );
      expect(component.getProfileImageUrl()).toContain(
        BASE_CLOUDFLARE_IMAGES_URL,
      );
      expect(component.getProfileImageUrl()).toContain('img-123-300');
    });

    it('should return formatted original image if 300px missing', () => {
      component.character = {
        ...mockCharacter,
        profilePicture300: null,
      } as Character;
      expect(component.getProfileImageUrl()).toContain('img-123');
    });

    it('should return unavailable if both images missing', () => {
      component.character = {
        ...mockCharacter,
        profilePicture300: null,
        profilePicture: null,
      } as Character;
      expect(component.getProfileImageUrl()).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
    });

    it('should return exact URL if it starts with http', () => {
      component.character = {
        ...mockCharacter,
        profilePicture300: 'https://example.com/img.jpg',
      } as Character;
      expect(component.getProfileImageUrl()).toBe(
        'https://example.com/img.jpg',
      );
    });

    it('should return R2 URL if it starts with local/', () => {
      component.character = {
        ...mockCharacter,
        profilePicture300: 'local/image.png',
      } as Character;
      expect(component.getProfileImageUrl()).toBe(
        `${CLOUDFLARE_R2_PUBLIC_URL}/local/image.png`,
      );
    });
  });
});
