import { LogEntryType } from 'src/app/models/captains-log.models';

import {
  defaultLogHeadline,
  LOG_PICTURE_REQUIREMENT,
  LOG_PICTURE_SPEC,
  logPictureOf,
} from './captains-log.constants';

describe('Captain’s Log constants (sc-1450)', () => {
  it('heads an entry with no headline by its type and stardate, as the server does', () => {
    expect(defaultLogHeadline(LogEntryType.CAPTAIN, 104502.57)).toBe(
      "Captain's Log stardate 104502.6",
    );
    expect(defaultLogHeadline(LogEntryType.PERSONAL, 104000)).toBe(
      'Personal Log stardate 104000.0',
    );
  });

  it('sends a picture to the entry’s own address, at a cover’s shape', () => {
    expect(LOG_PICTURE_SPEC.endpoint).toBe('picture');
    expect(LOG_PICTURE_SPEC.aspectLabel).toBe('16:9');
    expect(LOG_PICTURE_REQUIREMENT).toContain('16:9');
  });

  it('draws an entry’s picture card-sized or full size, and nothing without one', () => {
    const entry = {
      pictureUrls: { cover640x360: 'small', cover1920x1080: 'large' },
      pictureAlt: 'The bridge',
    };

    expect(logPictureOf(entry, 'card')).toEqual({
      url: 'small',
      alt: 'The bridge',
    });
    expect(logPictureOf(entry, 'page')?.url).toBe('large');
    expect(logPictureOf({ ...entry, pictureAlt: null }, 'card')?.alt).toBe('');
    expect(
      logPictureOf({ pictureUrls: null, pictureAlt: null }, 'card'),
    ).toBeNull();
  });
});
