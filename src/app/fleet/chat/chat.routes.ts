import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';

/** The kinds of address beneath `/chat`, each with an ID. */
export const CHAT_ROUTE_KINDS = [
  'channels',
  'direct',
  'communities',
  'fleets',
  'armadas',
] as const;

/** One kind of address beneath `/chat`. */
export type ChatRouteKind = (typeof CHAT_ROUTE_KINDS)[number];

/**
 * Matches `/chat` and each address beneath it with one route, so moving
 * between places keeps the page — its list and its connection — and only
 * changes what it shows.
 *
 * @param segments - The address beneath `/chat`.
 * @returns The match, with `kind` and `id`, or null.
 */
export function chatMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0) {
    return { consumed: [] };
  }

  if (
    segments.length === 2 &&
    (CHAT_ROUTE_KINDS as readonly string[]).includes(segments[0].path)
  ) {
    return {
      consumed: segments,
      posParams: { kind: segments[0], id: segments[1] },
    };
  }

  return null;
}

/** Chat's page (FC-033), signed in only. */
export const CHAT_ROUTES: Routes = [
  {
    matcher: chatMatcher,
    loadComponent: () =>
      import('./chat-page/chat-page.component').then(m => m.ChatPageComponent),
    data: { title: APP_ROUTE_TITLES.CHAT },
  },
];
