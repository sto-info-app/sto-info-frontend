import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character, Species } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { CharacterManageComponent } from './character-manage.component';

describe('CharacterManageComponent', () => {
  let component: CharacterManageComponent;
  let fixture: ComponentFixture<CharacterManageComponent>;
  let mockRouter: jest.Mocked<
    Pick<Router, 'navigate' | 'createUrlTree' | 'serializeUrl'>
  >;
  let mockCharacterService: jest.Mocked<
    Pick<
      CharacterService,
      | 'getCharactersByAccount'
      | 'getCharacter'
      | 'createCharacter'
      | 'updateCharacter'
    >
  >;
  let mockStoAccountService: jest.Mocked<
    Pick<StoAccountService, 'getAccounts'>
  >;
  let mockLookupService: jest.Mocked<
    Pick<
      CharacterLookupService,
      | 'getGeneralFactions'
      | 'getFactions'
      | 'getSexes'
      | 'getClasses'
      | 'getRecruitTypes'
      | 'getSpecies'
    >
  >;
  let routeParamsSubject: Subject<Params>;

  const mockAccount = {
    id: 'acc1',
    handle: 'TestAccount',
    platformId: 'pc',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'TestChar',
    accountId: 'acc1',
    generalFactionId: 'fed',
    factionId: 'fed',
    sexId: 'male',
    classId: 'tac',
    recruitTypeId: 'std',
    speciesId: 'human',
    level: 65,
    createdDate: '2023-01-01T00:00:00.000Z',
  } as Character;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn(),
      createUrlTree: jest.fn(),
      serializeUrl: jest.fn(),
    };

    mockCharacterService = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
      getCharacter: jest.fn().mockReturnValue(of(mockCharacter)),
      createCharacter: jest.fn().mockReturnValue(of(mockCharacter)),
      updateCharacter: jest.fn().mockReturnValue(of(mockCharacter)),
    };

    mockStoAccountService = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    };

    mockLookupService = {
      getGeneralFactions: jest
        .fn()
        .mockReturnValue(of([{ id: 'fed', name: 'Federal' }])),
      getFactions: jest
        .fn()
        .mockReturnValue(of([{ id: 'fed', name: 'Federation' }])),
      getSexes: jest.fn().mockReturnValue(of([{ id: 'male', name: 'Male' }])),
      getClasses: jest
        .fn()
        .mockReturnValue(of([{ id: 'tac', name: 'Tactical' }])),
      getRecruitTypes: jest
        .fn()
        .mockReturnValue(of([{ id: 'std', name: 'Standard' }])),
      getSpecies: jest
        .fn()
        .mockReturnValue(of([{ id: 'human', name: 'Human' }])),
    };

    routeParamsSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [
        CharacterManageComponent,
        NoopAnimationsModule,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: CharacterService, useValue: mockCharacterService },
        { provide: StoAccountService, useValue: mockStoAccountService },
        { provide: CharacterLookupService, useValue: mockLookupService },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParamsSubject.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterManageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit / loadInitialData', () => {
    it('should load initial data and set mode to add', fakeAsync(() => {
      fixture.detectChanges();
      routeParamsSubject.next({ handle: encodeStoHandle('TestAccount') });
      tick(); // flush loadInitialData forkJoin

      expect(component.mode).toBe('add');
      expect(component.accountHandle).toBe('TestAccount');
      expect(component.accountId).toBe('acc1');
      expect(mockLookupService.getGeneralFactions).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    }));

    it('should handle edit mode and load character', fakeAsync(() => {
      fixture.detectChanges();
      routeParamsSubject.next({
        handle: encodeStoHandle('TestAccount'),
        characterHandle: 'TestChar',
      });
      tick(); // flush loadInitialData and loadCharacter

      expect(component.mode).toBe('edit');
      expect(mockCharacterService.getCharacter).toHaveBeenCalledWith('char1');
      expect(component.characterForm.get('handle')?.value).toBe('TestChar');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle account not found', fakeAsync(() => {
      mockStoAccountService.getAccounts.mockReturnValue(of([]));
      fixture.detectChanges();
      routeParamsSubject.next({ handle: encodeStoHandle('Unknown') });
      tick();

      expect(component.errorMessage).toBe('Account not found');
    }));

    it('should handle error loading character details', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.getCharacter.mockReturnValue(
        throwError(() => new Error('Error')),
      );
      fixture.detectChanges();
      routeParamsSubject.next({
        handle: encodeStoHandle('TestAccount'),
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Failed to load character details');
      spy.mockRestore();
    }));

    it('should handle error loading characters list in edit mode', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.getCharactersByAccount.mockReturnValue(
        throwError(() => new Error('Error')),
      );
      fixture.detectChanges();
      routeParamsSubject.next({
        handle: encodeStoHandle('TestAccount'),
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Failed to load characters');
      spy.mockRestore();
    }));

    it('should handle non-existent character in edit mode', fakeAsync(() => {
      mockCharacterService.getCharactersByAccount.mockReturnValue(of([])); // No characters
      fixture.detectChanges();
      routeParamsSubject.next({
        handle: encodeStoHandle('TestAccount'),
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.errorMessage).toBe('Character not found');
    }));

    it('should handle error loading initial data', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLookupService.getGeneralFactions.mockReturnValue(
        throwError(() => new Error('Error')),
      );
      fixture.detectChanges();
      routeParamsSubject.next({ handle: encodeStoHandle('TestAccount') });
      tick();

      expect(component.errorMessage).toBe('Failed to load form data');
      spy.mockRestore();
    }));
  });

  describe('Dynamic form logic', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      routeParamsSubject.next({ handle: encodeStoHandle('TestAccount') });
      tick();
    }));

    it('should update species when faction changes', fakeAsync(() => {
      mockLookupService.getRecruitTypes.mockReturnValue(
        of([{ id: 'std', name: 'Standard' }]),
      );
      component.characterForm.get('factionId')?.setValue('fed');
      tick();

      expect(mockLookupService.getSpecies).toHaveBeenCalledWith('fed', ''); // recruitType empty initially
      expect(component.speciesList).toHaveLength(1);
    }));

    it('should update species when recruit type changes', fakeAsync(() => {
      component.characterForm.get('factionId')?.setValue('fed'); // sets species
      tick();

      mockLookupService.getSpecies.mockClear();
      component.characterForm.patchValue({ recruitTypeId: 'std' });
      tick();

      expect(mockLookupService.getSpecies).toHaveBeenCalledWith('fed', 'std');
    }));

    it('should reset speciesId if not valid for new selection', fakeAsync(() => {
      // Set speciesId first without emitting/triggering updates that might overwrite it immediately if logic was simple
      component.characterForm.controls['speciesId'].setValue('alien');
      // Now change faction, which triggers updateSpecies
      component.characterForm.controls['factionId'].setValue('fed');
      tick();

      // 'alien' is not in the mock returned for 'fed' (which is 'human')
      // So it should reset
      expect(component.characterForm.get('speciesId')?.value).toBe('');
    }));

    it('should reset recruitTypeId if not valid for new faction', fakeAsync(() => {
      mockLookupService.getRecruitTypes.mockReturnValue(
        of([{ id: 'other', name: 'Other' }]),
      ); // std not present
      component.characterForm.patchValue({ recruitTypeId: 'std' });
      component.characterForm.get('factionId')?.setValue('klingon');
      tick();

      expect(component.characterForm.get('recruitTypeId')?.value).toBe('');
    }));

    it('should reset speciesList if factionId is empty', fakeAsync(() => {
      component.speciesList = [{ id: 'human', name: 'Human' } as Species];
      component.characterForm.get('factionId')?.setValue('');
      tick();

      expect(component.speciesList).toHaveLength(0);
      expect(component.characterForm.get('speciesId')?.value).toBe('');
    }));
  });

  describe('loadCharacter edge cases', () => {
    it('should handle null createdDate', fakeAsync(() => {
      const charWithNoDate = {
        ...mockCharacter,
        id: 'char1',
        createdDate: undefined,
      };
      mockCharacterService.getCharacter.mockReturnValue(of(charWithNoDate));
      fixture.detectChanges();
      routeParamsSubject.next({
        handle: encodeStoHandle('TestAccount'),
        characterHandle: 'TestChar',
      });
      tick();

      expect(component.characterForm.get('createdDate')?.value).toBeNull();
    }));
  });

  describe('onSave', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      routeParamsSubject.next({ handle: encodeStoHandle('TestAccount') });
      tick();
    }));

    it('should handle null createdDate in payload', fakeAsync(() => {
      component.mode = 'add';
      component.accountId = 'acc1';
      component.characterForm.patchValue({
        handle: 'NewCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
        createdDate: undefined,
      });

      component.onSave();
      tick();

      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          createdDate: undefined,
        }),
      );
    }));

    it('should include formatted createdDate in payload if present', fakeAsync(() => {
      component.mode = 'add';
      component.accountId = 'acc1';
      const date = new Date('2023-01-01');
      component.characterForm.patchValue({
        handle: 'NewCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
        createdDate: date,
      });

      component.onSave();
      tick();

      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          createdDate: date.toISOString(),
        }),
      );
    }));

    it('should create character in add mode', fakeAsync(() => {
      component.mode = 'add';
      component.accountId = 'acc1';
      // Fill valid form
      component.characterForm.patchValue({
        handle: 'NewCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(mockCharacterService.createCharacter).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
      ]);
    }));

    it('should update character in edit mode', fakeAsync(() => {
      component.mode = 'edit';
      component.accountId = 'acc1';
      component.characterId = 'char1';
      component.characterForm.patchValue({
        handle: 'UpdatedCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(mockCharacterService.updateCharacter).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
        'UpdatedCapt',
      ]);
    }));

    it('should handle error on create', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.createCharacter.mockReturnValue(
        throwError(() => ({ error: { message: 'Fail' } })),
      );
      component.mode = 'add';
      component.accountId = 'acc1';
      component.characterForm.patchValue({
        handle: 'NewCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(component.errorMessage).toBe('Fail');
      expect(component.isSubmitting).toBe(false);
      spy.mockRestore();
    }));

    it('should handle error on update', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.updateCharacter.mockReturnValue(
        throwError(() => ({ error: { message: 'Fail Update' } })),
      );
      component.mode = 'edit';
      component.accountId = 'acc1';
      component.characterId = 'char1';
      component.characterForm.patchValue({
        handle: 'UpdatedCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(component.errorMessage).toBe('Fail Update');
      expect(component.isSubmitting).toBe(false);
      spy.mockRestore();
    }));

    it('should not submit if form is invalid', () => {
      component.characterForm.patchValue({ handle: '' }); // Invalid
      component.onSave();
      expect(mockCharacterService.createCharacter).not.toHaveBeenCalled();
    });

    it('should use default error message if error message is missing on create', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.createCharacter.mockReturnValue(
        throwError(() => ({ error: {} })),
      );
      component.mode = 'add';
      component.accountId = 'acc1';
      component.characterForm.patchValue({
        handle: 'NewCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(component.errorMessage).toBe('Failed to create character.');
      spy.mockRestore();
    }));

    it('should use default error message if error message is missing on update', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCharacterService.updateCharacter.mockReturnValue(
        throwError(() => ({ error: {} })),
      );
      component.mode = 'edit';
      component.accountId = 'acc1';
      component.characterId = 'char1';
      component.characterForm.patchValue({
        handle: 'UpdatedCapt',
        level: 65,
        generalFactionId: 'fed',
        factionId: 'fed',
        sexId: 'male',
        classId: 'tac',
        recruitTypeId: 'std',
        speciesId: 'human',
      });

      component.onSave();
      tick();

      expect(component.errorMessage).toBe('Failed to update character.');
      spy.mockRestore();
    }));
  });

  describe('onCancel', () => {
    it('should navigate back to account view in add mode', () => {
      component.mode = 'add';
      component.accountHandle = 'TestAccount';
      component.onCancel();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
      ]);
    });

    it('should navigate back to character view in edit mode', () => {
      component.mode = 'edit';
      component.accountHandle = 'TestAccount';
      component.characterHandle = 'TestChar';
      component.onCancel();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/dashboard/accounts',
        encodeStoHandle('TestAccount'),
        'TestChar',
      ]);
    });
  });

  describe('Error handling in subscriptions', () => {
    it('should handle error when loading species', fakeAsync(() => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLookupService.getSpecies.mockReturnValue(
        throwError(() => new Error('Species Error')),
      );

      fixture.detectChanges();
      // Trigger updateSpecies
      component.characterForm.controls['factionId'].setValue('fed');
      tick(); // Update species triggered

      expect(spy).toHaveBeenCalledWith(
        'Failed to load species',
        expect.any(Error),
      );
      spy.mockRestore();
    }));
  });
});
