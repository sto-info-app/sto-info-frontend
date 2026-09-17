import {
  availableTimezones,
  describeTimezone,
  deviceTimezone,
  FALLBACK_TIMEZONE,
  isUsableTimezone,
} from './timezone.utils';

describe('timezone utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deviceTimezone', () => {
    it('reports the zone this runtime is set to', () => {
      expect(deviceTimezone()).toBe(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    });

    it('falls back to UTC when the runtime reports nothing', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
        resolvedOptions: () => ({ timeZone: '' }),
      } as unknown as Intl.DateTimeFormat);

      expect(deviceTimezone()).toBe(FALLBACK_TIMEZONE);
    });

    /**
     * UTC rather than a guess. A date rendered in the wrong zone reads as a
     * perfectly ordinary date and gives no sign that it is wrong.
     */
    it('falls back to UTC when the runtime throws', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        throw new Error('no Intl here');
      });

      expect(deviceTimezone()).toBe(FALLBACK_TIMEZONE);
    });
  });

  describe('isUsableTimezone', () => {
    it.each(['UTC', 'Europe/London', 'America/New_York', 'Pacific/Auckland'])(
      'accepts %s',
      zone => {
        expect(isUsableTimezone(zone)).toBe(true);
      },
    );

    it.each([null, undefined, '', 'Europe/Nowhere', 'Not a zone'])(
      'rejects %s',
      zone => {
        expect(isUsableTimezone(zone)).toBe(false);
      },
    );
  });

  describe('availableTimezones', () => {
    it('puts UTC first and lists it only once', () => {
      const zones = availableTimezones();

      expect(zones[0]).toBe(FALLBACK_TIMEZONE);
      expect(zones.filter(zone => zone === FALLBACK_TIMEZONE)).toHaveLength(1);
    });

    it('sorts the rest', () => {
      const [, ...rest] = availableTimezones();

      expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
    });

    it('offers only zones the runtime can convert with', () => {
      expect(
        availableTimezones().filter(zone => !isUsableTimezone(zone)),
      ).toEqual([]);
    });

    /**
     * An older runtime gets a short list rather than an empty control. A picker
     * with nothing in it is worse than one with only the obvious answers.
     */
    it('falls back to UTC and the device zone without supportedValuesOf', () => {
      const original = Intl.supportedValuesOf;
      (Intl as { supportedValuesOf?: unknown }).supportedValuesOf = undefined;

      try {
        expect(availableTimezones()).toEqual([
          FALLBACK_TIMEZONE,
          deviceTimezone(),
        ]);
      } finally {
        (Intl as { supportedValuesOf?: unknown }).supportedValuesOf = original;
      }
    });
  });

  describe('describeTimezone', () => {
    /**
     * The identifier is what gets stored, but the offset is what tells somebody
     * they have picked the right one.
     */
    it('adds the offset in force at the given instant', () => {
      expect(
        describeTimezone('Europe/London', new Date('2026-01-15T12:00:00Z')),
      ).toBe('Europe/London (GMT+0)');
      expect(
        describeTimezone('Europe/London', new Date('2026-07-15T12:00:00Z')),
      ).toBe('Europe/London (GMT+1)');
    });

    it('returns the identifier alone when the runtime cannot describe it', () => {
      expect(describeTimezone('Europe/Nowhere')).toBe('Europe/Nowhere');
    });

    it('returns the identifier alone when no offset comes back', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
        formatToParts: () => [{ type: 'literal', value: '' }],
      } as unknown as Intl.DateTimeFormat);

      expect(describeTimezone('Europe/London')).toBe('Europe/London');
    });
  });
});
