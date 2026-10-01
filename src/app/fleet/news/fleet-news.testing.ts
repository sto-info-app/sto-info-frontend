import { EnvironmentProviders, Provider } from '@angular/core';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';

import { BehaviorSubject } from 'rxjs';

import {
  GovernanceReader,
  governanceRoute,
  GovernanceRouteStubs,
} from 'src/app/fleet/governance/governance.testing';
import { FleetNewsPage, FleetNewsPost } from 'src/app/models/fleet-news.models';

import { FleetNewsService } from './fleet-news.service';

/** Who is reading a news page, where, and what the address asks. */
export interface NewsReader extends GovernanceReader {
  /** The post the address names, on a post or its editor. */
  readonly postSlug?: string;
  /** The address's query. */
  readonly query?: Record<string, string>;
}

/** The stubs a news page is drawn with. */
export interface NewsRouteStubs extends GovernanceRouteStubs {
  /** The address's query, which a test may change. */
  readonly query$: BehaviorSubject<ParamMap>;
}

/**
 * Builds a post of a Fleet's news (FC-027).
 *
 * @param overrides - Fields to override.
 * @returns The post.
 */
export function newsPost(
  overrides: Partial<FleetNewsPost> = {},
): FleetNewsPost {
  return {
    id: 'post-1',
    slug: 'refit-night-abc',
    title: 'Refit night',
    summary: 'Bring your ships.',
    status: 'PUBLISHED',
    audience: 'PUBLIC',
    publishedAt: '2026-09-28T10:00:00.000Z',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T09:30:00.000Z',
    coverImageId: null,
    coverImageUrl: null,
    coverImageAlt: null,
    author: { username: 'FleetOwner', linksToProfile: true },
    body: 'Friday at **eight**.',
    ...overrides,
  };
}

/**
 * Builds a page of news.
 *
 * @param items - The posts.
 * @param overrides - Fields to override.
 * @returns The page.
 */
export function newsPage(
  items: FleetNewsPost[],
  overrides: Partial<FleetNewsPage> = {},
): FleetNewsPage {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    mayWrite: false,
    isOpen: true,
    isSuspended: false,
    ...overrides,
  };
}

/**
 * The providers a news page needs: the Manage pages' scope resolution, with
 * a route that also carries the post and the query.
 *
 * @param reader - Who is reading, where, and what the address asks.
 * @param news - The news service's stand-in.
 * @returns The stubs, and the providers built on them.
 */
export function newsRoute(reader: NewsReader, news: object): NewsRouteStubs {
  const route = governanceRoute(reader, {});
  const params$ = new BehaviorSubject<ParamMap>(
    convertToParamMap({
      ...Object.fromEntries(
        route.params$.value.keys.map(key => [
          key,
          route.params$.value.get(key),
        ]),
      ),
      ...(reader.postSlug ? { postSlug: reader.postSlug } : {}),
    }),
  );
  const query$ = new BehaviorSubject<ParamMap>(
    convertToParamMap(reader.query ?? {}),
  );
  const providers: (Provider | EnvironmentProviders)[] = [
    ...route.providers,
    { provide: FleetNewsService, useValue: news },
    {
      provide: ActivatedRoute,
      useValue: {
        paramMap: params$,
        queryParamMap: query$,
        get snapshot() {
          return {
            data: reader.onArmada ? { governs: 'ARMADA' } : {},
            paramMap: params$.value,
            queryParamMap: query$.value,
          };
        },
      },
    },
  ];

  return { ...route, params$, query$, providers };
}
