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
  STO_ACCOUNT_DETAIL: rootDashboard + '/accounts/:handle',
  STO_CHARACTER_DETAIL: rootDashboard + '/accounts/:handle/:characterHandle',
  STO_CHARACTER_ADD: rootDashboard + '/accounts/:handle/characters/add',
  STO_CHARACTER_EDIT: rootDashboard + '/accounts/:handle/:characterHandle/edit',

  // Error Pages
  SERVICE_INTERRUPTION: 'service-interruption',
};

export const APP_ROUTE_TITLES = {
  //Default
  HOME: 'Home',
  PAGE_NOT_FOUND: 'Page Not Found',

  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  REGISTER_COMPLETE: 'Registration Complete',
  VERIFY_EMAIL: 'Verify Email',
  RESET_PASSWORD: 'Reset Password',
  CHANGE_PASSWORD: 'Change Password',

  // Static Pages
  ABOUT: 'About',
  CONTACT: 'Contact us',
  TERMS_OF_USE: 'Terms of Use',
  CREDITS: 'Credits',
  PRIVACY_POLICY: 'Privacy Policy',

  // STO App Routes
  STO_DASHBOARD: 'Dashboard',
  STO_DASHBOARD_PROFILE: 'Profile',
  STO_DASHBOARD_ACCOUNTS: 'Your Accounts',
  STO_ACCOUNT_DETAIL: 'Account Details',
  STO_CHARACTER_DETAIL: 'Character Details',
  STO_CHARACTER_ADD: 'Add Character',
  STO_CHARACTER_EDIT: 'Edit Character',

  // Error Pages
  SERVICE_INTERRUPTION: 'Service Interruption',
};
