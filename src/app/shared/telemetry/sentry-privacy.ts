import type { Breadcrumb, ErrorEvent } from '@sentry/angular';

/**
 * Session Replay's privacy settings (FC-038): every text, every input and
 * every picture on the page masked, so a replay shows the shape of a page
 * and never a roster, a chat message or a form's content.
 */
export const SENTRY_REPLAY_PRIVACY = {
  maskAllText: true,
  maskAllInputs: true,
  blockAllMedia: true,
} as const;

/**
 * A web address without its query, which can carry search words.
 *
 * @param url - The address.
 * @returns It, up to the query.
 */
function withoutQuery(url: unknown): unknown {
  return typeof url === 'string' ? url.split('?')[0] : url;
}

/**
 * Takes out of an error event everything a person sent (FC-038): the
 * request's body, query and cookies, and the query of its address.
 *
 * @param event - The event.
 * @returns The event.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.query_string;
    delete event.request.cookies;
    event.request.url = withoutQuery(event.request.url) as string | undefined;
  }

  return event;
}

/**
 * Takes the query out of the addresses a breadcrumb records (FC-038).
 *
 * @param breadcrumb - The breadcrumb.
 * @returns It.
 */
export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.data) {
    for (const key of ['url', 'from', 'to']) {
      if (key in breadcrumb.data) {
        breadcrumb.data[key] = withoutQuery(breadcrumb.data[key]);
      }
    }
  }

  return breadcrumb;
}
