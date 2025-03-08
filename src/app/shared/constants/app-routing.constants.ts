const rootDashboard = 'dashboard';

export const APP_ROUTES = {
  // Auth
  LOGIN: 'login',
  REGISTER: 'register',
  REGISTER_COMPLETE: 'register/complete',
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  CHANGE_PASSWORD: 'change-password',

  // Static Pages
  ABOUT: 'about',
  CONTACT: 'contact',
  TERMS_OF_USE: 'terms-of-use',
  CREDITS: 'credits',
  PRIVACY_POLICY: 'privacy-policy',

  // STO App Routes
  STO_DASHBOARD: rootDashboard,
  STO_DASHBOARD_PROFILE: rootDashboard + '/profile',
  STO_DASHBOARD_ACCOUNTS: rootDashboard + '/accounts',
};
