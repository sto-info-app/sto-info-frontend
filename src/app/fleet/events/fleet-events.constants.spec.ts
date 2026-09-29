import {
  eventCharactersOf,
  fleetEventActionLabel,
  fleetEventAudienceLabel,
  fleetEventRuleOf,
  ordinalOf,
} from './fleet-events.constants';
import { eventDetail } from './fleet-events.testing';

describe('fleet events wording', () => {
  it.each([
    ['PUBLIC', 'FLEET', 'Anyone'],
    ['COMMUNITY', 'FLEET', 'The Community’s followers and members'],
    ['MEMBERS', 'COMMUNITY', 'Members of the Community'],
    ['MEMBERS', 'FLEET', 'Members of the Fleet'],
    ['OFFICERS', 'ARMADA', 'The Owner, Admins and Officers of the Armada'],
    ['SELECTED', 'FLEET', 'Chosen Fleets and roles'],
  ] as const)('words %s for a %s', (audience, kind, label) => {
    expect(fleetEventAudienceLabel(audience, kind)).toBe(label);
  });

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [31, '31st'],
  ])('writes %i as %s', (day, ordinal) => {
    expect(ordinalOf(day)).toBe(ordinal);
  });

  it.each([
    [{ recurrence: 'NONE' as const }, 'Once, on 2026-10-02'],
    [
      { recurrence: 'WEEKLY' as const, weekdays: [5] },
      'Every week on Friday, from 2026-10-02',
    ],
    [
      {
        recurrence: 'WEEKLY' as const,
        interval: 2,
        weekdays: [1, 3, 5],
        occurrenceLimit: 10,
      },
      'Every 2 weeks on Monday, Wednesday and Friday, from 2026-10-02, 10 times',
    ],
    [
      {
        recurrence: 'MONTHLY_DAY' as const,
        monthDay: 31,
        endsOn: '2027-06-01',
      },
      'Every month on the 31st, from 2026-10-02, until 2027-06-01',
    ],
    [
      {
        recurrence: 'MONTHLY_WEEKDAY' as const,
        interval: 3,
        monthWeek: -1,
        monthWeekday: 5,
      },
      'Every 3 months on the last Friday, from 2026-10-02',
    ],
  ])('says how an event repeats', (rule, sentence) => {
    expect(fleetEventRuleOf(eventDetail(rule))).toBe(sentence);
  });

  it.each([
    ['CREATED', null, 'Created'],
    ['EDITED', null, 'Changed from then on'],
    ['CANCELLED', null, 'Cancelled'],
    ['OCCURRENCE_CANCELLED', null, 'One occurrence cancelled'],
    ['OCCURRENCE_MOVED', null, 'One occurrence moved'],
    ['ATTENDANCE_RECORDED', 'Kira', 'Attendance of Kira recorded'],
    ['ATTENDANCE_RECORDED', null, 'Attendance of somebody recorded'],
    ['CLOSED_WITH_SCOPE', null, 'Cancelled when its scope closed'],
    ['SOMETHING_NEW', null, 'SOMETHING_NEW'],
  ])('says what a %s line records', (action, subjectName, label) => {
    expect(
      fleetEventActionLabel({
        id: 'a1',
        action,
        occurrenceId: null,
        actorName: null,
        subjectName,
        detail: null,
        createdAt: '2026-09-28T12:00:00.000Z',
      }),
    ).toBe(label);
  });

  it('lists the reader’s Characters on every account', () => {
    expect(
      eventCharactersOf([
        { handle: 'kira#1234', characters: [{ id: 'c1', handle: 'Kira' }] },
        { handle: 'odo#5678', characters: [{ id: 'c2', handle: 'Odo' }] },
      ] as never),
    ).toEqual([
      { id: 'c1', label: 'Kira@kira#1234' },
      { id: 'c2', label: 'Odo@odo#5678' },
    ]);
  });
});
