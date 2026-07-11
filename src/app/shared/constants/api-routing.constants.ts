import { environment } from 'src/environments/environment';

const apiUrl = environment.apiUrl;
const rootApiAuth = apiUrl + '/auth';
const rootApiHealth = apiUrl + '/health';

export const API_URLS = {
  //Root
  ROOT: apiUrl,
  VERSION: apiUrl + '/version',

  // Auth
  AUTH_LOGIN: rootApiAuth + '/login',
  AUTH_LOGOUT: rootApiAuth + '/logout',
  AUTH_REGISTER: rootApiAuth + '/register',
  AUTH_REFRESH: rootApiAuth + '/refresh',
  AUTH_VERIFY_EMAIL: rootApiAuth + '/verify-email',
  AUTH_RESET_PASSWORD_REQUEST: rootApiAuth + '/request-password-reset',
  AUTH_RESET_PASSWORD: rootApiAuth + '/reset-password',
  AUTH_VERIFICATION_EMAIL: rootApiAuth + '/verify-email',
  AUTH_RESEND_VERIFICATION_EMAIL: rootApiAuth + '/resend-verification-email',

  // Health
  HEALTH_LIVE: rootApiHealth + '/live',
  HEALTH_READY: rootApiHealth + '/ready',

  // App state (polled: banners + unread count)
  APP_STATE: apiUrl + '/app-state',

  // User
  USER: apiUrl + '/user',
  CLOSE_ACCOUNT: apiUrl + '/user/close-account',
  UPDATE_USER_PROFILE: apiUrl + '/user/update-profile',
  UPDATE_USER_PROFILE_PIC: apiUrl + '/user/update-profile-pic',

  // STO Account
  STO_ACCOUNT: apiUrl + '/account',
  STO_PLATFORM: apiUrl + '/platform',
  STO_LAUNCHER: apiUrl + '/launcher',
  STO_PLATFORM_LAUNCHER: apiUrl + '/platform-launcher',

  // Character
  CHARACTER: apiUrl + '/character',
  CHARACTER_LOOKUP_GENERAL_FACTIONS:
    apiUrl + '/character/lookup/general-factions',
  CHARACTER_LOOKUP_FACTIONS: apiUrl + '/character/lookup/factions',
  CHARACTER_LOOKUP_SEXES: apiUrl + '/character/lookup/sexes',
  CHARACTER_LOOKUP_CLASSES: apiUrl + '/character/lookup/classes',
  CHARACTER_LOOKUP_RECRUIT_TYPES: apiUrl + '/character/lookup/recruit-types',
  CHARACTER_LOOKUP_SPECIES: apiUrl + '/character/lookup/species',

  // Endeavours
  ENDEAVOUR: apiUrl + '/endeavour',

  // Stats
  STATS: apiUrl + '/stats',

  // Contact
  CONTACT: apiUrl + '/contact',

  // News
  NEWS: apiUrl + '/news',
  NEWS_ADMIN: apiUrl + '/news/admin',

  // Notifications
  NOTIFICATIONS: apiUrl + '/notifications',
  NOTIFICATIONS_BANNERS: apiUrl + '/notifications/banners',
  NOTIFICATIONS_UNREAD_COUNT: apiUrl + '/notifications/unread-count',
  NOTIFICATIONS_READ_ALL: apiUrl + '/notifications/read-all',
  NOTIFICATIONS_ADMIN: apiUrl + '/notifications/admin',
  NOTIFICATIONS_ADMIN_BANNERS: apiUrl + '/notifications/admin/banners',
};
