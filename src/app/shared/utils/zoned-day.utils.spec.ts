import {
  endOfLocalDay,
  localDayOf,
  momentsOf,
  startOfLocalDay,
} from './zoned-day.utils';

describe('zoned days', () => {
  describe('localDayOf', () => {
    it('gives the day an instant fell on in the zone asked for', () => {
      // 23:30 UTC on 15 November is already the 16th in Berlin.
      expect(localDayOf('2024-11-15T23:30:00.000Z', 'Europe/Berlin')).toBe(
        '2024-11-16',
      );
      expect(localDayOf('2024-11-15T23:30:00.000Z', 'America/New_York')).toBe(
        '2024-11-15',
      );
    });
  });

  describe('endOfLocalDay', () => {
    it('ends a winter day in London at midnight UTC', () => {
      expect(endOfLocalDay('2024-11-15', 'Europe/London')).toBe(
        '2024-11-15T23:59:59.999Z',
      );
    });

    it('ends a summer day in London an hour earlier in UTC', () => {
      expect(endOfLocalDay('2024-07-15', 'Europe/London')).toBe(
        '2024-07-15T22:59:59.999Z',
      );
    });

    it('ends a day west of Greenwich the next day in UTC', () => {
      expect(endOfLocalDay('2024-11-15', 'America/New_York')).toBe(
        '2024-11-16T04:59:59.999Z',
      );
    });

    // The clocks went back at 02:00 BST on 27 October 2024, so the day has
    // 25 hours and ends in GMT.
    it('ends the day the clocks went back in the offset it ended in', () => {
      expect(endOfLocalDay('2024-10-27', 'Europe/London')).toBe(
        '2024-10-27T23:59:59.999Z',
      );
    });

    it('ends the last day of a month on the right day', () => {
      expect(endOfLocalDay('2024-02-29', 'UTC')).toBe(
        '2024-02-29T23:59:59.999Z',
      );
    });

    it.each(['', '15/11/2024', '2024-11'])('refuses %j as a day', day => {
      expect(endOfLocalDay(day, 'UTC')).toBeNull();
    });
  });

  describe('startOfLocalDay', () => {
    it('starts a day at its midnight in the zone', () => {
      expect(startOfLocalDay('2024-07-15', 'Europe/London')).toBe(
        '2024-07-14T23:00:00.000Z',
      );
      expect(startOfLocalDay('2024-11-15', 'Asia/Kolkata')).toBe(
        '2024-11-14T18:30:00.000Z',
      );
    });

    it('refuses something that is not a day', () => {
      expect(startOfLocalDay('yesterday', 'UTC')).toBeNull();
    });

    it.each([
      ['an offset it cannot read', [{ type: 'timeZoneName', value: 'GMT' }]],
      ['no offset at all', []],
    ])('reads a zone Intl gives %s for as UTC', (_, parts) => {
      const format = Intl.DateTimeFormat;
      const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
        (locales, options) =>
          ({
            ...new format(locales, options),
            formatToParts: () => parts,
          }) as unknown as Intl.DateTimeFormat,
      );

      try {
        expect(startOfLocalDay('2024-07-15', 'Europe/London')).toBe(
          '2024-07-15T00:00:00.000Z',
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('momentsOf', () => {
    it('names one instant for most wall-clock times', () => {
      expect(momentsOf('2024-12-01T12:00:00', 'Europe/London')).toEqual([
        '2024-12-01T12:00:00.000Z',
      ]);
      expect(momentsOf('2024-07-01T12:00:00', 'Europe/London')).toEqual([
        '2024-07-01T11:00:00.000Z',
      ]);
      expect(momentsOf('2024-11-03T12:00:00', 'America/New_York')).toEqual([
        '2024-11-03T17:00:00.000Z',
      ]);
    });

    it('names both instants in the hour the clock went back over', () => {
      expect(momentsOf('2024-11-03T01:30:00', 'America/New_York')).toEqual([
        '2024-11-03T05:30:00.000Z',
        '2024-11-03T06:30:00.000Z',
      ]);
      expect(momentsOf('2024-10-27T01:30:00', 'Europe/London')).toEqual([
        '2024-10-27T00:30:00.000Z',
        '2024-10-27T01:30:00.000Z',
      ]);
    });

    it('names none in the hour the clock skipped', () => {
      expect(momentsOf('2024-03-31T01:30:00', 'Europe/London')).toEqual([]);
    });

    it('names none for a stamp that is not one', () => {
      expect(momentsOf('20241201-120000', 'Europe/London')).toEqual([]);
    });
  });
});
