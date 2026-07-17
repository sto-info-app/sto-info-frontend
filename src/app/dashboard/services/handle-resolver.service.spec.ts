import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Character } from '../models/character.model';
import { StoAccount } from '../models/sto-account.model';
import { CharacterService } from './character.service';
import { HandleResolverService } from './handle-resolver.service';
import { StoAccountService } from './sto-account.service';

describe('HandleResolverService', () => {
  let service: HandleResolverService;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
  } as Character;

  beforeEach(() => {
    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
      ],
    });

    service = TestBed.inject(HandleResolverService);
  });

  describe('resolveAccount', () => {
    it('should resolve an account by handle', done => {
      service.resolveAccount('Test#1234').subscribe(account => {
        expect(account).toEqual(mockAccount);
        done();
      });
    });

    it('should error when the account is not found', done => {
      service.resolveAccount('Missing#1234').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Account not found');
          done();
        },
      });
    });

    it('should error when accounts fail to load', done => {
      stoAccountServiceSpy.getAccounts.mockReturnValue(
        throwError(() => new Error('accounts fail')),
      );

      service.resolveAccount('Test#1234').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Failed to load account details');
          done();
        },
      });
    });
  });

  describe('resolveCharacter', () => {
    it('should resolve a character by account and character handle', done => {
      service.resolveCharacter('Test#1234', 'Seven').subscribe(character => {
        expect(character).toEqual(mockCharacter);
        expect(characterServiceSpy.getCharactersByAccount).toHaveBeenCalledWith(
          'acc1',
        );
        done();
      });
    });

    it('should propagate account resolution errors', done => {
      service.resolveCharacter('Missing#1234', 'Seven').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Account not found');
          expect(
            characterServiceSpy.getCharactersByAccount,
          ).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should error when the character is not found', done => {
      service.resolveCharacter('Test#1234', 'Missing').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Character not found');
          done();
        },
      });
    });

    it('should error when characters fail to load', done => {
      characterServiceSpy.getCharactersByAccount.mockReturnValue(
        throwError(() => new Error('characters fail')),
      );

      service.resolveCharacter('Test#1234', 'Seven').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Failed to load account characters');
          done();
        },
      });
    });
  });
});
