import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router, Event as RouterEvent } from '@angular/router';
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

  const mockAccount: StoAccount = {
    id: 'acc-1',
    handle: 'TestAccount',
    platformId: 'pc',
  } as StoAccount;

  const mockCharacter: Character = {
    id: 'char-1',
    handle: 'TestChar',
    accountId: 'acc-1',
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

    await TestBed.configureTestingModule({
      imports: [CharacterDetailComponent, MatButtonModule, LoadingBarComponent],
      providers: [
        { provide: CharacterService, useValue: mockCharacterService },
        { provide: StoAccountService, useValue: mockStoAccountService },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParamsSubject.asObservable() },
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
