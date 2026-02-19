import { PATREON_URL, SOCIAL_MEDIA_ROUTES } from './external-routes.constants';

describe('external-routes.constants', () => {
  it('should export SOCIAL_MEDIA_ROUTES with expected URLs', () => {
    expect(SOCIAL_MEDIA_ROUTES.REDDIT).toContain('reddit.com');
    expect(SOCIAL_MEDIA_ROUTES.GITHUB).toContain('github.com');
    expect(SOCIAL_MEDIA_ROUTES.DISCORD).toContain('discord.gg');
    expect(SOCIAL_MEDIA_ROUTES.BLUESKY).toContain('bsky.app');
  });

  it('should export PATREON_URL', () => {
    expect(PATREON_URL).toContain('patreon.com');
  });
});
