import { UrlSegment } from '@angular/router';

import { CHAT_ROUTES, chatMatcher } from './chat.routes';

/**
 * The segments of an address beneath `/chat`.
 *
 * @param path - The address.
 * @returns Its segments.
 */
const segmentsOf = (path: string): UrlSegment[] =>
  path
    .split('/')
    .filter(Boolean)
    .map(part => new UrlSegment(part, {}));

describe('chat routes', () => {
  it('matches /chat itself', () => {
    expect(chatMatcher([])).toEqual({ consumed: [] });
  });

  it.each(['channels', 'direct', 'communities', 'fleets', 'armadas'])(
    'matches /chat/%s/:id with one route',
    kind => {
      const segments = segmentsOf(`${kind}/abc`);

      expect(chatMatcher(segments)).toEqual({
        consumed: segments,
        posParams: { kind: segments[0], id: segments[1] },
      });
    },
  );

  it.each(['channels', 'elsewhere/abc', 'channels/abc/more'])(
    'matches nothing else: %s',
    path => {
      expect(chatMatcher(segmentsOf(path))).toBeNull();
    },
  );

  it('loads the page', async () => {
    const component = await (
      CHAT_ROUTES[0].loadComponent as () => Promise<unknown>
    )();

    expect((component as { name: string }).name).toBe('ChatPageComponent');
  });
});
