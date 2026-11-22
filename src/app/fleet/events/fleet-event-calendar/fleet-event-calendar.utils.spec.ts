import { calendarEntry } from '../fleet-events.testing';
import {
  agendaOf,
  calendarMonthOf,
  calendarRangeOf,
  dayKeyOf,
  monthGridOf,
  monthNameOf,
  shiftMonth,
} from './fleet-event-calendar.utils';

const NOW = new Date('2026-09-30T23:30:00.000Z');

describe('fleet event calendar', () => {
  it('reads the month asked for, or the current one in the reader’s zone', () => {
    expect(calendarMonthOf('2027-02', NOW, 'UTC')).toBe('2027-02');
    // Half past midnight on 1 October in London.
    expect(calendarMonthOf(null, NOW, 'Europe/London')).toBe('2026-10');
    expect(calendarMonthOf('2027-13', NOW, 'UTC')).toBe('2026-09');
  });

  it('moves a month on or back across a year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('names a month', () => {
    expect(monthNameOf('2026-12')).toBe('December 2026');
  });

  it('reads a week either side of a month', () => {
    expect(calendarRangeOf('2026-10')).toEqual({
      from: '2026-09-24T00:00:00.000Z',
      to: '2026-11-08T00:00:00.000Z',
    });
  });

  it('names the day an instant falls on in a zone', () => {
    expect(dayKeyOf(NOW, 'UTC')).toBe('2026-09-30');
    expect(dayKeyOf(NOW, 'Europe/London')).toBe('2026-10-01');
  });

  describe('the month grid', () => {
    it('lays out whole weeks from the Monday before the 1st', () => {
      const weeks = monthGridOf('2026-10', [], '2026-10-01', 'UTC');

      expect(weeks).toHaveLength(5);
      expect(weeks[0].map(day => day.key)).toEqual([
        '2026-09-28',
        '2026-09-29',
        '2026-09-30',
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
      ]);
      expect(weeks[0][0].inMonth).toBe(false);
      expect(weeks[0][3]).toEqual(
        expect.objectContaining({ date: 1, inMonth: true, isToday: true }),
      );
      expect(weeks[4][6].key).toBe('2026-11-01');
    });

    it('starts on the 1st when it is a Monday', () => {
      expect(monthGridOf('2027-02', [], '', 'UTC')[0][0].key).toBe(
        '2027-02-01',
      );
    });

    it('puts each occurrence on the day it starts in the reader’s zone', () => {
      const late = calendarEntry({
        id: 'late',
        startsAt: '2026-10-02T23:30:00.000Z',
      });
      const weeks = monthGridOf('2026-10', [late], '', 'Europe/London');
      const byKey = new Map(weeks.flat().map(day => [day.key, day.entries]));

      expect(byKey.get('2026-10-03')).toEqual([late]);
      expect(byKey.get('2026-10-02')).toEqual([]);
    });
  });

  it('lists only the month’s days that anything starts on, in order', () => {
    const first = calendarEntry({
      id: 'first',
      startsAt: '2026-10-02T19:00:00.000Z',
    });
    const second = calendarEntry({
      id: 'second',
      startsAt: '2026-10-02T21:00:00.000Z',
    });
    const outside = calendarEntry({
      id: 'outside',
      startsAt: '2026-09-29T19:00:00.000Z',
    });
    const later = calendarEntry({
      id: 'later',
      startsAt: '2026-10-16T19:00:00.000Z',
    });

    expect(
      agendaOf('2026-10', [outside, first, second, later], '2026-10-16', 'UTC'),
    ).toEqual([
      {
        key: '2026-10-02',
        date: 2,
        inMonth: true,
        isToday: false,
        entries: [first, second],
      },
      {
        key: '2026-10-16',
        date: 16,
        inMonth: true,
        isToday: true,
        entries: [later],
      },
    ]);
  });
});
