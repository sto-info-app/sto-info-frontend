import {
  getAccountBgImagePath,
  getClassCategory,
  getFactionClass,
  getLauncherClass,
  getPlatformClass,
  getSexIcon,
} from './card-theme.utils';

describe('cardThemeUtils', () => {
  describe('getPlatformClass', () => {
    it.each([
      ['PlayStation', 'platform-playstation'],
      ['ps', 'platform-playstation'],
      ['Xbox', 'platform-xbox'],
      ['Steam', 'platform-steam'],
      ['Windows', 'platform-pc'],
      ['PC', 'platform-pc'],
      ['Arc', 'platform-arc'],
      ['Epic', 'platform-epic'],
    ])('should map %s onto %s', (name, expected) => {
      expect(getPlatformClass(name)).toBe(expected);
    });

    it('should return an empty string for an unknown platform', () => {
      expect(getPlatformClass('Amiga')).toBe('');
    });

    it('should return an empty string when no platform is supplied', () => {
      expect(getPlatformClass()).toBe('');
      expect(getPlatformClass(null)).toBe('');
    });
  });

  describe('getLauncherClass', () => {
    it.each([
      ['Arc', 'launcher-arc'],
      ['Epic', 'launcher-epic'],
      ['Steam', 'launcher-steam'],
    ])('should map %s onto %s for PC accounts', (name, expected) => {
      expect(getLauncherClass('platform-pc', name)).toBe(expected);
    });

    it('should return an empty string for an unknown PC launcher', () => {
      expect(getLauncherClass('platform-pc', 'Origin')).toBe('');
    });

    it('should not theme launchers on non-PC platforms', () => {
      expect(getLauncherClass('platform-xbox', 'Steam')).toBe('');
    });

    it('should return an empty string when no launcher is supplied', () => {
      expect(getLauncherClass('platform-pc')).toBe('');
      expect(getLauncherClass('platform-pc', null)).toBe('');
    });
  });

  describe('getAccountBgImagePath', () => {
    it.each([
      ['arc', '/assets/account-types/account_type_windows_arc.jpg'],
      ['epic', '/assets/account-types/account_type_windows_epic.jpg'],
      ['steam', '/assets/account-types/account_type_windows_steam.jpg'],
    ])('should pick the %s background for PC accounts', (name, expected) => {
      expect(getAccountBgImagePath('platform-pc', name)).toBe(expected);
    });

    it('should fall back to the default windows background', () => {
      expect(getAccountBgImagePath('platform-pc')).toBe(
        '/assets/account-types/account_type_windows_default.jpg',
      );
    });

    it.each([
      [
        'platform-playstation',
        '/assets/account-types/account_type_playstation.jpg',
      ],
      ['platform-xbox', '/assets/account-types/account_type_xbox.jpg'],
      ['platform-arc', '/assets/account-types/account_type_windows_arc.jpg'],
      ['platform-epic', '/assets/account-types/account_type_windows_epic.jpg'],
      [
        'platform-steam',
        '/assets/account-types/account_type_windows_steam.jpg',
      ],
    ])('should pick the background for %s', (platformClass, expected) => {
      expect(getAccountBgImagePath(platformClass)).toBe(expected);
    });

    it('should fall back to the default background for an unknown platform', () => {
      expect(getAccountBgImagePath('')).toBe(
        '/assets/account-types/account_type_default.jpg',
      );
    });
  });

  describe('getFactionClass', () => {
    it('should lower-case the faction name', () => {
      expect(getFactionClass('Federation')).toBe('federation');
    });

    it('should hyphenate multi-word faction names', () => {
      expect(getFactionClass('Alien Domain')).toBe('alien-domain');
    });

    it('should default to unknown when no faction is supplied', () => {
      expect(getFactionClass()).toBe('unknown');
      expect(getFactionClass(null)).toBe('unknown');
      expect(getFactionClass('')).toBe('unknown');
    });
  });

  describe('getClassCategory', () => {
    it.each([
      ['Tactical', 'tactical'],
      ['Engineering', 'engineering'],
      ['Science', 'science'],
    ])('should map %s onto %s', (name, expected) => {
      expect(getClassCategory(name)).toBe(expected);
    });

    it('should match on a substring so compound names still theme', () => {
      expect(getClassCategory('Tactical Officer')).toBe('tactical');
    });

    it('should default to unknown', () => {
      expect(getClassCategory('Medical')).toBe('unknown');
      expect(getClassCategory()).toBe('unknown');
      expect(getClassCategory(null)).toBe('unknown');
    });
  });

  describe('getSexIcon', () => {
    it('should map male onto mars', () => {
      expect(getSexIcon('Male')).toBe('mars');
    });

    it('should map female onto venus', () => {
      expect(getSexIcon('Female')).toBe('venus');
    });

    it('should default to a question mark', () => {
      expect(getSexIcon('Unknown')).toBe('circle-question');
      expect(getSexIcon()).toBe('circle-question');
      expect(getSexIcon(null)).toBe('circle-question');
    });
  });
});
