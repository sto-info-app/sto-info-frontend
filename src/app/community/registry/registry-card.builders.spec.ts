import {
  buildRegistryAccountCard,
  buildRegistryAccountLink,
  buildRegistryCharacterCard,
  buildRegistryCharacterLink,
  buildRegistryProfileLink,
} from './registry-card.builders';
import {
  buildAccountSummary,
  buildCharacterSummary,
} from './registry-test-fixtures';

describe('registryCardBuilders', () => {
  describe('link builders', () => {
    it('should build a profile link', () => {
      expect(buildRegistryProfileLink('captain.picard')).toEqual([
        '/community/registry/profiles',
        'captain.picard',
      ]);
    });

    it('should build an account link nested under the member', () => {
      expect(buildRegistryAccountLink('captain.picard', 'SteveX~1234')).toEqual(
        ['/community/registry/profiles', 'captain.picard', 'SteveX~1234'],
      );
    });

    it('should build a captain link nested under the account', () => {
      expect(
        buildRegistryCharacterLink('captain.picard', 'SteveX~1234', 'Rex'),
      ).toEqual([
        '/community/registry/profiles',
        'captain.picard',
        'SteveX~1234',
        'Rex',
      ]);
    });

    // Regression: pre-encoding here made routerLink encode a second time, so a
    // captain handle with special characters reached the URL as `%2523` and
    // 404'd.
    it('should leave segments raw for routerLink to encode exactly once', () => {
      expect(
        buildRegistryCharacterLink(
          'captain.picard',
          'SteveX~1234',
          'Rex#Prime',
        ),
      ).toEqual([
        '/community/registry/profiles',
        'captain.picard',
        'SteveX~1234',
        'Rex#Prime',
      ]);
    });
  });

  describe('buildRegistryAccountCard', () => {
    it('should map the account onto a read-only card', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary(),
        'captain.picard',
      );

      expect(card.id).toBe('SteveX~1234');
      expect(card.handle).toBe('SteveX#1234');
      expect(card.link).toEqual([
        '/community/registry/profiles',
        'captain.picard',
        'SteveX~1234',
      ]);
      expect(card.characterCount).toBe(4);
      expect(card.lifetimeSubscription).toBe(true);
      expect(card.actions).toEqual([]);
      expect(card.endeavour).toBeNull();
    });

    it('should theme the card from the platform and launcher names', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary({ platformName: 'Windows', launcherName: 'Arc' }),
        'captain.picard',
      );

      expect(card.themeClass).toBe('platform-pc launcher-arc');
    });

    it('should prefer the API-supplied card background', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary({
          accountTypeImageUrl: 'https://cdn.example.com/bg/public',
        }),
        'captain.picard',
      );

      expect(card.bgImagePath).toBe('https://cdn.example.com/bg/public');
    });

    it('should fall back to a derived background when none is supplied', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary({
          accountTypeImageUrl: '   ',
          platformName: 'Xbox',
        }),
        'captain.picard',
      );

      expect(card.bgImagePath).toBe(
        '/assets/account-types/account_type_xbox.jpg',
      );
    });

    it('should build visibly labelled, non-personal detail rows', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary(),
        'captain.picard',
      );

      expect(card.details).toEqual([
        expect.objectContaining({
          label: 'Platform',
          text: 'Steam',
          showLabel: true,
        }),
        expect.objectContaining({
          label: 'Launcher',
          text: 'Arc',
          showLabel: true,
        }),
        expect.objectContaining({
          label: 'Playing Since',
          text: 'March 4, 2015',
          showLabel: true,
        }),
        expect.objectContaining({
          label: 'Lifetime Subscription',
          text: 'Yes',
          showLabel: true,
        }),
      ]);
    });

    it('should not also announce the platform and launcher to screen readers', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary(),
        'captain.picard',
      );

      expect(card.platformName).toBeNull();
      expect(card.launcherName).toBeNull();
    });

    it('should omit rows whose value is unknown', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary({
          platformName: null,
          launcherName: null,
          accountCreatedDate: null,
          lifetimeSubscription: false,
        }),
        'captain.picard',
      );

      expect(card.details).toEqual([
        expect.objectContaining({ label: 'Lifetime Subscription', text: 'No' }),
      ]);
    });
  });

  describe('buildRegistryCharacterCard', () => {
    it('should map the captain onto a read-only card', () => {
      const card = buildRegistryCharacterCard(
        buildCharacterSummary(),
        'captain.picard',
        'SteveX~1234',
      );

      expect(card.id).toBe('Rex@SteveX~1234');
      expect(card.handle).toBe('Rex');
      expect(card.level).toBe(65);
      expect(card.link).toEqual([
        '/community/registry/profiles',
        'captain.picard',
        'SteveX~1234',
        'Rex',
      ]);
      expect(card.factionClass).toBe('federation');
      expect(card.classCategory).toBe('tactical');
      expect(card.sexIcon).toBe('mars');
      expect(card.speciesName).toBe('Vulcan');
      expect(card.rankTitle).toBe('Fleet Admiral');
      expect(card.actions).toEqual([]);
    });

    it('should prefer the small profile image', () => {
      const card = buildRegistryCharacterCard(
        buildCharacterSummary(),
        'captain.picard',
        'SteveX~1234',
      );

      expect(card.imageUrl).toBe('https://cdn.example.com/char/square100');
    });

    it('should fall back to the larger profile image', () => {
      const card = buildRegistryCharacterCard(
        buildCharacterSummary({ profilePicture100: null }),
        'captain.picard',
        'SteveX~1234',
      );

      expect(card.imageUrl).toBe('https://cdn.example.com/char/square300');
    });

    it('should null out lookups that are not present', () => {
      const card = buildRegistryCharacterCard(
        buildCharacterSummary({
          rank: null,
          species: null,
          class: null,
          sex: null,
          faction: null,
          generalFaction: null,
          recruitType: null,
        }),
        'captain.picard',
        'SteveX~1234',
      );

      expect(card.rankTitle).toBeNull();
      expect(card.rankIconUrl).toBeNull();
      expect(card.speciesName).toBeNull();
      expect(card.factionName).toBeNull();
      expect(card.recruitTypeName).toBeNull();
      expect(card.factionClass).toBe('unknown');
      expect(card.classCategory).toBe('unknown');
      expect(card.sexIcon).toBe('circle-question');
    });
  });
});
