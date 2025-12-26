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

  // User
  USER: apiUrl + '/user',
  UPDATE_USER_PROFILE: apiUrl + '/user/update-profile',
  UPDATE_USER_PROFILE_PIC: apiUrl + '/user/update-profile-pic',
};
