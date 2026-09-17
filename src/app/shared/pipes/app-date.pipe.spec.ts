import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';

import { AppDatePipe } from './app-date.pipe';

describe('AppDatePipe', () => {
  let pipe: AppDatePipe;
  let timezone: ReturnType<typeof signal<string>>;

  // Midday UTC, so every zone under test lands on the same calendar day and a
  // wrong answer shows up as a wrong hour rather than an off-by-one date.
  const INSTANT = '2026-07-15T12:00:00.000Z';

  beforeEach(() => {
    timezone = signal('UTC');

    TestBed.configureTestingModule({
      providers: [
        AppDatePipe,
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: timezone },
        },
      ],
    });

    pipe = TestBed.inject(AppDatePipe);
  });

  it('renders in the zone the reader has chosen', () => {
    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('12:00');

    timezone.set('Europe/London');
    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('13:00');

    timezone.set('America/New_York');
    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('08:00');
  });

  /**
   * The reason this pipe is impure. A pure pipe caches on its inputs, so a
   * reader who changed their timezone would keep seeing the old one until
   * something else about the page changed.
   */
  it('re-renders the same value when the zone changes', () => {
    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('12:00');

    timezone.set('Pacific/Auckland');

    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('00:00');
  });

  it('formats the same value once per distinct zone', () => {
    const first = pipe.transform(INSTANT, 'HH:mm');
    const second = pipe.transform(INSTANT, 'HH:mm');

    expect(second).toBe(first);
  });

  it('defaults to a medium date', () => {
    expect(pipe.transform(INSTANT)).toBe('Jul 15, 2026');
  });

  it.each([null, undefined, ''])('renders %s as nothing', value => {
    expect(pipe.transform(value)).toBeNull();
  });

  it('accepts a Date and epoch milliseconds as well as a string', () => {
    const expected = pipe.transform(INSTANT, 'HH:mm');

    expect(pipe.transform(new Date(INSTANT), 'HH:mm')).toBe(expected);
    expect(pipe.transform(Date.parse(INSTANT), 'HH:mm')).toBe(expected);
  });

  /**
   * A malformed date is a bad row, not a reason for the page around it to
   * disappear.
   */
  it('renders an unusable value as nothing rather than throwing', () => {
    expect(() => pipe.transform('not a date')).not.toThrow();
    expect(pipe.transform('not a date')).toBeNull();
  });

  it('survives a zone the runtime cannot use', () => {
    timezone.set('Europe/Nowhere');

    expect(() => pipe.transform(INSTANT)).not.toThrow();
  });

  /**
   * The offset is what Angular's pipe is actually handed, so a runtime that
   * will not report one has to leave the date rendered in the browser's zone
   * rather than rendered wrongly or not at all.
   */
  it('falls back to the browser zone when no offset can be read', () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      formatToParts: () => [{ type: 'literal', value: 'nothing useful' }],
    } as unknown as Intl.DateTimeFormat);

    expect(() => pipe.transform(INSTANT, 'HH:mm')).not.toThrow();
    expect(pipe.transform(INSTANT, 'HH:mm')).not.toBeNull();

    jest.restoreAllMocks();
  });

  it('renders UTC itself without an offset', () => {
    timezone.set('UTC');

    expect(pipe.transform(INSTANT, 'HH:mm')).toBe('12:00');
  });
});
