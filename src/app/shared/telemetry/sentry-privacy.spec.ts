import type { ErrorEvent } from '@sentry/angular';

import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  SENTRY_REPLAY_PRIVACY,
} from './sentry-privacy';

const CANARY = 'OFFICER-CANARY';

describe('Sentry privacy (FC-038)', () => {
  it('masks every text, input and picture in a replay', () => {
    expect(SENTRY_REPLAY_PRIVACY).toEqual({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    });
  });

  it('sends no body, query or cookie of a request with an error', () => {
    const event = scrubSentryEvent({
      type: undefined,
      request: {
        url: `https://sto.info/api/chat?q=${CANARY}`,
        data: { body: CANARY },
        query_string: `q=${CANARY}`,
        cookies: { session: CANARY },
      },
    } as ErrorEvent);

    expect(JSON.stringify(event)).not.toContain(CANARY);
    expect(event.request!.url).toBe('https://sto.info/api/chat');
  });

  it('leaves an event with no request alone', () => {
    expect(scrubSentryEvent({ type: undefined } as ErrorEvent)).toEqual({
      type: undefined,
    });
  });

  it('records where a breadcrumb went, not what it searched for', () => {
    const crumb = scrubSentryBreadcrumb({
      category: 'navigation',
      data: {
        from: `/chat?q=${CANARY}`,
        to: '/fleets',
        url: 7,
        status_code: 200,
      },
    });

    expect(JSON.stringify(crumb)).not.toContain(CANARY);
    expect(crumb.data).toEqual({
      from: '/chat',
      to: '/fleets',
      url: 7,
      status_code: 200,
    });
    expect(scrubSentryBreadcrumb({ category: 'ui.click' })).toEqual({
      category: 'ui.click',
    });
    expect(
      scrubSentryBreadcrumb({
        category: 'xhr',
        data: { url: `/api/chat?q=${CANARY}`, method: 'GET' },
      }).data,
    ).toEqual({ url: '/api/chat', method: 'GET' });
  });
});
