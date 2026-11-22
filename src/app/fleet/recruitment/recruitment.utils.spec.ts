import { HttpErrorResponse } from '@angular/common/http';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';

import {
  recruitmentCharactersOf,
  recruitmentRefusalOf,
} from './recruitment.utils';

/**
 * Builds an account with Characters.
 *
 * @param handle - The account's handle.
 * @param platformName - Its platform.
 * @param characters - Its Characters' ids and names.
 * @returns The account.
 */
function account(
  handle: string,
  platformName: string | null,
  characters: [string, string][],
): SwitcherAccount {
  return {
    id: `account-${handle}`,
    handle,
    platformName,
    launcherName: null,
    lifetimeSubscription: false,
    pinnedAt: null,
    characters: characters.map(([id, name]) => ({
      id,
      handle: name,
      profilePicture100: null,
      factionName: null,
      factionIconUrl: null,
      generalFactionName: null,
      pinnedAt: null,
    })),
  };
}

describe('recruitmentCharactersOf', () => {
  it('offers the Characters on the Fleet’s platform, as Name@handle', () => {
    expect(
      recruitmentCharactersOf(
        [
          account('tova', 'Windows', [
            ['c-1', 'Tova Rhen'],
            ['c-2', 'Iko'],
          ]),
          account('tova-ps', 'PlayStation', [['c-3', 'Tova']]),
          account('nobody', null, [['c-4', 'Lost']]),
          account('second', 'Windows', [['c-5', 'Dax Orlan']]),
        ],
        'Windows',
      ),
    ).toEqual([
      { id: 'c-1', label: 'Tova Rhen@tova' },
      { id: 'c-2', label: 'Iko@tova' },
      { id: 'c-5', label: 'Dax Orlan@second' },
    ]);
  });

  it('offers nothing when no account plays there', () => {
    expect(
      recruitmentCharactersOf([account('tova', 'Windows', [])], 'Xbox'),
    ).toEqual([]);
  });
});

describe('recruitmentRefusalOf', () => {
  /**
   * Builds a refusal.
   *
   * @param status - The HTTP status.
   * @param body - What it carried.
   * @returns The error.
   */
  function refusal(status: number, body: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: body });
  }

  it.each([400, 403, 404, 409])(
    'gives the server’s own sentence for a %s',
    status => {
      expect(
        recruitmentRefusalOf(
          refusal(status, { message: 'Already a member of this Fleet.' }),
          'fallback',
        ),
      ).toBe('Already a member of this Fleet.');
    },
  );

  it('joins a validation failure’s sentences', () => {
    expect(
      recruitmentRefusalOf(
        refusal(400, { message: ['First.', 'Second.'] }),
        'fallback',
      ),
    ).toBe('First. Second.');
  });

  it.each([
    ['a server failure', refusal(500, { message: 'Stack trace here' })],
    ['an empty sentence', refusal(409, { message: '' })],
    ['an empty list', refusal(400, { message: [] })],
    ['a list of other things', refusal(400, { message: [1] })],
    ['no body', refusal(409, null)],
    ['something not from HTTP', new Error('offline')],
  ])('falls back for %s', (_name, error) => {
    expect(recruitmentRefusalOf(error, 'fallback')).toBe('fallback');
  });
});
