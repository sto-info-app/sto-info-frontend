import {
  AccountFilterFields,
  AccountFilters,
  AccountSortFields,
  NO_ACCOUNT_FILTERS,
  buildAccountFilterOptions,
  buildAccountSearchHaystack,
  countActiveAccountFilters,
  matchesAccountFilters,
  sortAccounts,
} from './account-list.utils';

describe('buildAccountSearchHaystack', () => {
  it('joins and lower-cases the values', () => {
    expect(buildAccountSearchHaystack(['Picard', 'JeanLuc@ENT.com'])).toBe(
      'picard jeanluc@ent.com',
    );
  });

  it('ignores absent and blank values', () => {
    expect(
      buildAccountSearchHaystack(['Picard', null, undefined, '', '   ']),
    ).toBe('picard');
  });

  it('returns an empty string when there is nothing to search', () => {
    expect(buildAccountSearchHaystack([])).toBe('');
  });
});

describe('matchesAccountFilters', () => {
  const fields = (
    overrides: Partial<AccountFilterFields> = {},
  ): AccountFilterFields => ({
    searchHaystack: 'picard jeanluc@ent.com',
    platformKey: 'platform-pc',
    launcherKey: 'launcher-steam',
    lifetimeSubscription: false,
    pinned: false,
    ...overrides,
  });

  const filters = (
    overrides: Partial<AccountFilters> = {},
  ): AccountFilters => ({
    ...NO_ACCOUNT_FILTERS,
    ...overrides,
  });

  it('keeps every account when nothing is filtered', () => {
    expect(matchesAccountFilters(fields(), filters())).toBe(true);
  });

  describe('free-text search', () => {
    it('matches part of the haystack', () => {
      expect(
        matchesAccountFilters(fields(), filters({ searchText: 'card' })),
      ).toBe(true);
    });

    it('ignores the case of the search text', () => {
      expect(
        matchesAccountFilters(fields(), filters({ searchText: 'PICARD' })),
      ).toBe(true);
    });

    // A user who selects the text and types a space should not suddenly see
    // nothing, so the search text is trimmed before matching.
    it('ignores surrounding whitespace', () => {
      expect(
        matchesAccountFilters(fields(), filters({ searchText: '  picard  ' })),
      ).toBe(true);
    });

    it('rejects an account the search does not match', () => {
      expect(
        matchesAccountFilters(fields(), filters({ searchText: 'sisko' })),
      ).toBe(false);
    });

    it('keeps every account when the search is only whitespace', () => {
      expect(
        matchesAccountFilters(fields(), filters({ searchText: '   ' })),
      ).toBe(true);
    });
  });

  describe('platform and launcher', () => {
    it('keeps an account on the chosen platform', () => {
      expect(
        matchesAccountFilters(
          fields(),
          filters({ platformKey: 'platform-pc' }),
        ),
      ).toBe(true);
    });

    it('rejects an account on another platform', () => {
      expect(
        matchesAccountFilters(
          fields(),
          filters({ platformKey: 'platform-xbox' }),
        ),
      ).toBe(false);
    });

    it('rejects an account with no platform when one is chosen', () => {
      expect(
        matchesAccountFilters(
          fields({ platformKey: null }),
          filters({ platformKey: 'platform-pc' }),
        ),
      ).toBe(false);
    });

    it('keeps an account on the chosen launcher', () => {
      expect(
        matchesAccountFilters(
          fields(),
          filters({ launcherKey: 'launcher-steam' }),
        ),
      ).toBe(true);
    });

    it('rejects an account on another launcher', () => {
      expect(
        matchesAccountFilters(
          fields(),
          filters({ launcherKey: 'launcher-epic' }),
        ),
      ).toBe(false);
    });
  });

  describe('lifetime subscription', () => {
    it('keeps a lifetime account', () => {
      expect(
        matchesAccountFilters(
          fields({ lifetimeSubscription: true }),
          filters({ lifetimeOnly: true }),
        ),
      ).toBe(true);
    });

    it('rejects an account without a lifetime subscription', () => {
      expect(
        matchesAccountFilters(fields(), filters({ lifetimeOnly: true })),
      ).toBe(false);
    });
  });

  describe('pinned only', () => {
    it('keeps a pinned account', () => {
      expect(
        matchesAccountFilters(
          fields({ pinned: true }),
          filters({ pinnedOnly: true }),
        ),
      ).toBe(true);
    });

    it('rejects an unpinned account', () => {
      expect(
        matchesAccountFilters(fields(), filters({ pinnedOnly: true })),
      ).toBe(false);
    });
  });

  it('requires every applied filter to match', () => {
    expect(
      matchesAccountFilters(
        fields({ lifetimeSubscription: true }),
        filters({ searchText: 'picard', lifetimeOnly: true }),
      ),
    ).toBe(true);

    expect(
      matchesAccountFilters(
        fields({ lifetimeSubscription: true }),
        filters({ searchText: 'sisko', lifetimeOnly: true }),
      ),
    ).toBe(false);
  });
});

describe('countActiveAccountFilters', () => {
  it('counts nothing when no filter is applied', () => {
    expect(countActiveAccountFilters(NO_ACCOUNT_FILTERS)).toBe(0);
  });

  it('does not count a search of only whitespace', () => {
    expect(
      countActiveAccountFilters({ ...NO_ACCOUNT_FILTERS, searchText: '  ' }),
    ).toBe(0);
  });

  it('counts each applied filter once', () => {
    expect(
      countActiveAccountFilters({
        searchText: 'picard',
        platformKey: 'platform-pc',
        launcherKey: 'launcher-steam',
        lifetimeOnly: true,
        pinnedOnly: true,
      }),
    ).toBe(5);
  });
});

describe('sortAccounts', () => {
  const account = (
    handle: string,
    overrides: Partial<AccountSortFields> = {},
  ): AccountSortFields => ({
    handle,
    characterCount: 0,
    endeavourTotalNodes: 0,
    accountCreatedDate: null,
    pinned: false,
    ...overrides,
  });

  const handles = (accounts: AccountSortFields[]): string[] =>
    accounts.map(entry => entry.handle);

  it('orders by handle ascending by default', () => {
    expect(
      handles(sortAccounts([account('Sisko'), account('Archer')])),
    ).toEqual(['Archer', 'Sisko']);
  });

  it('orders by handle descending', () => {
    expect(
      handles(
        sortAccounts([account('Archer'), account('Sisko')], 'handle', 'DESC'),
      ),
    ).toEqual(['Sisko', 'Archer']);
  });

  it('compares handles case-insensitively', () => {
    expect(
      handles(sortAccounts([account('picard'), account('Archer')])),
    ).toEqual(['Archer', 'picard']);
  });

  it('does not modify the array it was given', () => {
    const input = [account('Sisko'), account('Archer')];

    sortAccounts(input);

    expect(handles(input)).toEqual(['Sisko', 'Archer']);
  });

  it('orders by captain count', () => {
    expect(
      handles(
        sortAccounts(
          [
            account('Archer', { characterCount: 1 }),
            account('Sisko', { characterCount: 9 }),
          ],
          'characterCount',
          'DESC',
        ),
      ),
    ).toEqual(['Sisko', 'Archer']);
  });

  it('orders by endeavour nodes', () => {
    expect(
      handles(
        sortAccounts(
          [
            account('Archer', { endeavourTotalNodes: 900 }),
            account('Sisko', { endeavourTotalNodes: 120 }),
          ],
          'endeavourTotalNodes',
        ),
      ),
    ).toEqual(['Sisko', 'Archer']);
  });

  describe('by account created date', () => {
    const dated = (handle: string, iso: string): AccountSortFields =>
      account(handle, { accountCreatedDate: iso });

    it('orders oldest first ascending', () => {
      expect(
        handles(
          sortAccounts(
            [dated('Sisko', '2015-06-01'), dated('Archer', '2010-01-01')],
            'accountCreatedDate',
          ),
        ),
      ).toEqual(['Archer', 'Sisko']);
    });

    it('orders newest first descending', () => {
      expect(
        handles(
          sortAccounts(
            [dated('Archer', '2010-01-01'), dated('Sisko', '2015-06-01')],
            'accountCreatedDate',
            'DESC',
          ),
        ),
      ).toEqual(['Sisko', 'Archer']);
    });

    it('puts accounts with no recorded date last when ascending', () => {
      expect(
        handles(
          sortAccounts(
            [account('Archer'), dated('Sisko', '2015-06-01')],
            'accountCreatedDate',
          ),
        ),
      ).toEqual(['Sisko', 'Archer']);
    });

    it('puts accounts with no recorded date last when descending', () => {
      expect(
        handles(
          sortAccounts(
            [account('Archer'), dated('Sisko', '2015-06-01')],
            'accountCreatedDate',
            'DESC',
          ),
        ),
      ).toEqual(['Sisko', 'Archer']);
    });

    // The same pair in the opposite input order must reach the same answer, so
    // both sides of the unset-date comparison are exercised.
    it('puts an account with no recorded date last whichever side it arrives on', () => {
      expect(
        handles(
          sortAccounts(
            [dated('Picard', '2012-03-01'), account('Archer')],
            'accountCreatedDate',
          ),
        ),
      ).toEqual(['Picard', 'Archer']);
    });

    it('falls back to handle order between two accounts with no date', () => {
      expect(
        handles(
          sortAccounts(
            [account('Sisko'), account('Archer')],
            'accountCreatedDate',
          ),
        ),
      ).toEqual(['Archer', 'Sisko']);
    });

    it('falls back to handle order between two identical dates', () => {
      expect(
        handles(
          sortAccounts(
            [dated('Sisko', '2012-03-01'), dated('Archer', '2012-03-01')],
            'accountCreatedDate',
          ),
        ),
      ).toEqual(['Archer', 'Sisko']);
    });
  });

  describe('pinning', () => {
    it('puts pinned accounts before unpinned ones', () => {
      expect(
        handles(
          sortAccounts([
            account('Archer'),
            account('Sisko', { pinned: true }),
            account('Picard'),
          ]),
        ),
      ).toEqual(['Sisko', 'Archer', 'Picard']);
    });

    it('keeps pinned accounts first when ordering descending', () => {
      expect(
        handles(
          sortAccounts(
            [account('Archer'), account('Sisko', { pinned: true })],
            'handle',
            'DESC',
          ),
        ),
      ).toEqual(['Sisko', 'Archer']);
    });

    it('applies the chosen sort within the pinned group', () => {
      expect(
        handles(
          sortAccounts(
            [
              account('Archer', { pinned: true, characterCount: 1 }),
              account('Sisko', { pinned: true, characterCount: 7 }),
              account('Picard', { characterCount: 9 }),
            ],
            'characterCount',
            'DESC',
          ),
        ),
      ).toEqual(['Sisko', 'Archer', 'Picard']);
    });
  });
});

describe('buildAccountFilterOptions', () => {
  it('builds one option per distinct value, ordered by label', () => {
    expect(
      buildAccountFilterOptions(['Steam', 'Arc', 'Steam', 'Epic']),
    ).toEqual([
      { value: 'Arc', label: 'Arc' },
      { value: 'Epic', label: 'Epic' },
      { value: 'Steam', label: 'Steam' },
    ]);
  });

  it('ignores absent and blank values', () => {
    expect(
      buildAccountFilterOptions(['Steam', null, undefined, '', '  ']),
    ).toEqual([{ value: 'Steam', label: 'Steam' }]);
  });

  it('returns nothing when no value is present', () => {
    expect(buildAccountFilterOptions([null, undefined])).toEqual([]);
  });

  it('orders case-insensitively', () => {
    expect(
      buildAccountFilterOptions(['steam', 'Arc']).map(o => o.value),
    ).toEqual(['Arc', 'steam']);
  });
});
