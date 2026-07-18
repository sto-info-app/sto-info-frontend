import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, switchMap, throwError } from 'rxjs';
import { Character } from '../models/character.model';
import { StoAccount } from '../models/sto-account.model';
import { CharacterService } from './character.service';
import { StoAccountService } from './sto-account.service';

/**
 * Resolves STO accounts and characters from their URL handles.
 *
 * Route URLs identify accounts and characters by handle rather than by ID, so
 * pages need to translate a handle into the underlying entity before they can
 * load any data for it. This service centralises that lookup; errors are
 * emitted as `Error` instances whose `message` is safe to show to the user.
 */
@Injectable({
  providedIn: 'root',
})
export class HandleResolverService {
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _characterService = inject(CharacterService);

  /** Resolves the account matching the given decoded STO handle. */
  resolveAccount(handle: string): Observable<StoAccount> {
    return this._stoAccountService.getAccounts().pipe(
      catchError(() =>
        throwError(() => new Error('Failed to load account details')),
      ),
      map(accounts => {
        const account = accounts.find(a => a.handle === handle);
        if (!account) {
          throw new Error('Account not found');
        }
        return account;
      }),
    );
  }

  /** Resolves a character by its account's decoded handle and its own handle. */
  resolveCharacter(
    handle: string,
    characterHandle: string,
  ): Observable<Character> {
    return this.resolveAccount(handle).pipe(
      switchMap(account =>
        this._characterService.getCharactersByAccount(account.id).pipe(
          catchError(() =>
            throwError(() => new Error('Failed to load account characters')),
          ),
          map(characters => {
            const character = characters.find(
              c => c.handle === characterHandle,
            );
            if (!character) {
              throw new Error('Character not found');
            }
            return character;
          }),
        ),
      ),
    );
  }
}
