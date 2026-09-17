import { formatDate } from '@angular/common';

import { buildFriendMemberCard } from 'src/app/community/member-card.builders';
import { buildRegistryAccountCard } from 'src/app/community/registry/registry-card.builders';
import { buildAccountSummary } from 'src/app/community/registry/registry-test-fixtures';

/**
 * The days a user typed must render as the same day everywhere.
 *
 * Three values mean a day rather than a moment: when an STO account was made,
 * when a captain was created, and when a member started playing. The API sends
 * them as `YYYY-MM-DD`, with no time and no offset, and this suite exists to
 * keep it that way — because the failure it guards against leaves no trace. A
 * date that is one day out still looks like a perfectly ordinary date, and the
 * machine that renders it correctly is usually the developer's.
 *
 * **Why this does not simply run in another timezone.** Setting `process.env.TZ`
 * from a spec has no effect once jsdom has started, so a suite that appeared to
 * run in New York would in fact be running wherever the machine is and proving
 * nothing. Instead the assertions are about the mechanism, which holds in every
 * zone: Angular parses a bare `YYYY-MM-DD` with local setters, so the day it
 * renders is the day in the string by construction, while a midnight-UTC
 * instant is parsed as a moment and lands on the previous day for any reader
 * behind Greenwich.
 */
describe('calendar date rendering', () => {
  describe('Angular date formatting', () => {
    it.each([
      ['2015-01-01', 'January 1, 2015'],
      ['2015-03-04', 'March 4, 2015'],
      ['2015-12-31', 'December 31, 2015'],
      ['2016-02-29', 'February 29, 2016'],
    ])('renders %s as %s', (day, expected) => {
      expect(formatDate(day, 'longDate', 'en-US')).toBe(expected);
    });

    /**
     * The mechanism. A bare day is built with local setters, so its local
     * calendar fields are the ones in the string and no conversion has
     * happened. This is what makes the cases above true in every timezone
     * rather than only in this one.
     */
    it('builds a bare day at local midnight, not at an instant', () => {
      const parsed = new Date(
        formatDate('2015-03-04', 'yyyy-MM-ddTHH:mm:ss', 'en-US'),
      );

      expect(parsed.getFullYear()).toBe(2015);
      expect(parsed.getMonth()).toBe(2);
      expect(parsed.getDate()).toBe(4);
      expect(parsed.getHours()).toBe(0);
    });

    /**
     * The shape this change removes, kept so the difference between the two is
     * written down rather than remembered. A midnight-UTC instant is a moment,
     * and a moment moves: it is still the fourth for a reader at or ahead of
     * Greenwich and already the third for one behind it. The expectation
     * follows the runner's own offset, so this documents the hazard wherever
     * the suite happens to run.
     */
    it('renders a midnight-UTC instant as the previous day behind Greenwich', () => {
      const instant = new Date('2015-03-04T00:00:00.000Z');
      const isBehindGreenwich = instant.getTimezoneOffset() > 0;

      expect(formatDate(instant, 'longDate', 'en-US')).toBe(
        isBehindGreenwich ? 'March 3, 2015' : 'March 4, 2015',
      );
    });
  });

  describe('the cards that show these days', () => {
    it('shows an account creation day unshifted', () => {
      const card = buildRegistryAccountCard(
        buildAccountSummary({ accountCreatedDate: '2015-03-04' }),
      );

      expect(card.details.some(detail => detail.text === 'March 4, 2015')).toBe(
        true,
      );
    });

    /**
     * The reader's chosen timezone is applied to the instants on a member card
     * and deliberately not to the day beside them. Auckland is thirteen hours
     * from New York, so a `playingSince` that were being converted would not
     * survive this.
     */
    it('leaves the day alone while converting the instants beside it', () => {
      const card = buildFriendMemberCard(
        {
          id: 'friendship-1',
          friendsSince: '2020-01-02T00:00:00.000Z',
          member: {
            username: 'captain.picard',
            profilePicture100: null,
            joinedAt: '2019-05-06T12:00:00.000Z',
            lastActiveAt: null,
            playingSince: '2015-03-04',
            publicAccountCount: 1,
            publicCharacterCount: 1,
          },
        } as Parameters<typeof buildFriendMemberCard>[0],
        'Pacific/Auckland',
      );

      expect(card.meta).toContain('Playing since March 4, 2015');
      expect(card.meta).toContain('Friends since January 2, 2020');
    });
  });
});
