import { environment } from '../../../environments/environment';

export const APP_DOMAIN_WITH_PROTOCOL =
  globalThis.window?.location?.origin ?? '';

const FALLBACK_APP_TITLE = 'Star Trek Online Info Portal';
const FALLBACK_SITE_URL = 'https://startrekonline.info';
const FALLBACK_SEO_DESCRIPTION =
  'Star Trek Online Info Portal is a fan-made, free-to-use community tool that helps you track, plan, and optimise your Star Trek Online gameplay.';
const FALLBACK_OG_IMAGE_URL = 'assets/social/og-1200x630.png';
const FALLBACK_TWITTER_IMAGE_URL = 'assets/social/twitter-1200x675.png';
const FALLBACK_TWITTER_HANDLE = '@MidNiteShadow7';
const FALLBACK_AUTHOR = 'Star Trek Online Info Portal (Fan Project)';

export const SEO_APP_TITLE = environment.appTitle || FALLBACK_APP_TITLE;

export const SEO_SITE_URL = APP_DOMAIN_WITH_PROTOCOL?.startsWith('http')
  ? APP_DOMAIN_WITH_PROTOCOL + '/'
  : FALLBACK_SITE_URL + '/';

export const SEO_DESCRIPTION = FALLBACK_SEO_DESCRIPTION;

export const SEO_OG_IMAGE_URL = SEO_SITE_URL + FALLBACK_OG_IMAGE_URL;

export const SEO_TWITTER_IMAGE_URL = SEO_SITE_URL + FALLBACK_TWITTER_IMAGE_URL;

export const SEO_TWITTER_HANDLE = FALLBACK_TWITTER_HANDLE;

export const SEO_AUTHOR = FALLBACK_AUTHOR;
