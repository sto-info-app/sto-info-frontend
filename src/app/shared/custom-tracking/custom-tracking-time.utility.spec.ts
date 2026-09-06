import {
  localDateTimeIn,
  timezoneOf,
  youTubeAddress,
} from './custom-tracking-time.utility';

describe('timezoneOf', () => {
  it('reads the timezone a definition names', () => {
    expect(timezoneOf({ defaultTimezone: 'Europe/London' })).toBe(
      'Europe/London',
    );
  });

  // A field that somehow carries none still has to render, and UTC is the one
  // answer that is wrong in the same way for everybody rather than silently
  // right for whoever happens to be reading.
  it('falls back to UTC where a definition names none', () => {
    expect(timezoneOf({})).toBe('UTC');
    expect(timezoneOf({ defaultTimezone: '' })).toBe('UTC');
  });
});

describe('localDateTimeIn', () => {
  it('reads an instant in the timezone it is asked for', () => {
    expect(localDateTimeIn('2026-01-04T18:30:00.000Z', 'UTC')).toBe(
      '2026-01-04T18:30',
    );
    expect(localDateTimeIn('2026-01-04T18:30:00.000Z', 'Asia/Tokyo')).toBe(
      '2026-01-05T03:30',
    );
  });

  // Midnight is 24 in some hour cycles and 00 in others, and only one of them
  // is a time an HTML control accepts.
  it('writes midnight as zero rather than as twenty-four', () => {
    expect(localDateTimeIn('2026-01-04T00:00:00.000Z', 'UTC')).toBe(
      '2026-01-04T00:00',
    );
  });
});

describe('youTubeAddress', () => {
  it('leaves the offset off where a video starts at the front', () => {
    expect(youTubeAddress('abcdefghijk', null)).toBe(
      'https://www.youtube.com/watch?v=abcdefghijk',
    );
  });
});

describe('youTubeAddress', () => {
  it('carries the offset where a video does not start at the front', () => {
    expect(youTubeAddress('abcdefghijk', 90)).toBe(
      'https://www.youtube.com/watch?v=abcdefghijk&t=90s',
    );
  });
});
