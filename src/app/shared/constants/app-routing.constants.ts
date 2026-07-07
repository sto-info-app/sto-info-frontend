export const ROOT_ROUTES = {
  ABOUT: 'about',
  DASHBOARD: 'dashboard',
  NEWS: 'news',
  ADMIN: 'admin',
};

export const APP_ROUTES = {
  //Default
  HOME: '/',

  // Auth
  LOGIN: 'login',
  REGISTER: 'register',
  REGISTER_COMPLETE: 'register/complete',
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password', // NOSONAR - This is the standard route for this page
  CHANGE_PASSWORD: 'change-password', // NOSONAR - This is the standard route for this page

  // Static Pages
  ABOUT: 'about',
  ROADMAP: 'roadmap',
  CONTACT: 'contact',
  TERMS_OF_USE: 'terms-of-use',
  CREDITS: 'credits',
  PRIVACY_POLICY: 'privacy-policy',
  ABOUT_DEVELOPERS: ROOT_ROUTES.ABOUT + '/developers',
  ABOUT_DEVELOPER_DETAIL: ROOT_ROUTES.ABOUT + '/developers/:slug',
  ABOUT_VOLUNTEERS: ROOT_ROUTES.ABOUT + '/volunteers',
  ABOUT_VOLUNTEER_DETAIL: ROOT_ROUTES.ABOUT + '/volunteers/:slug',
  ABOUT_SUPPORTERS: ROOT_ROUTES.ABOUT + '/supporters',

  // STO App Routes
  STO_DASHBOARD: ROOT_ROUTES.DASHBOARD,
  STO_DASHBOARD_PROFILE: ROOT_ROUTES.DASHBOARD + '/profile',
  STO_DASHBOARD_ACCOUNTS: ROOT_ROUTES.DASHBOARD + '/accounts',
  STO_ACCOUNT_ADD: ROOT_ROUTES.DASHBOARD + '/accounts/add',
  STO_ACCOUNT_EDIT: ROOT_ROUTES.DASHBOARD + '/accounts/:handle/edit',
  STO_ACCOUNT_DETAIL: ROOT_ROUTES.DASHBOARD + '/accounts/:handle',
  STO_ACCOUNT_ENDEAVOURS:
    ROOT_ROUTES.DASHBOARD + '/accounts/:handle/endeavours',
  STO_CHARACTER_DETAIL:
    ROOT_ROUTES.DASHBOARD + '/accounts/:handle/:characterHandle',
  STO_CHARACTER_ADD: ROOT_ROUTES.DASHBOARD + '/accounts/:handle/characters/add',
  STO_CHARACTER_EDIT:
    ROOT_ROUTES.DASHBOARD + '/accounts/:handle/:characterHandle/edit',
  STO_DASHBOARD_STATS: ROOT_ROUTES.DASHBOARD + '/stats',
  STO_DASHBOARD_STATS_DETAIL: ROOT_ROUTES.DASHBOARD + '/stats/:breakdownId',

  // News
  NEWS: ROOT_ROUTES.NEWS,
  NEWS_DETAIL: ROOT_ROUTES.NEWS + '/:slug',

  // Notifications
  NOTIFICATIONS: 'notifications',

  // Admin
  ADMIN: ROOT_ROUTES.ADMIN,
  ADMIN_NEWS: ROOT_ROUTES.ADMIN + '/news',
  ADMIN_NEWS_ADD: ROOT_ROUTES.ADMIN + '/news/add',
  ADMIN_NEWS_EDIT: ROOT_ROUTES.ADMIN + '/news/:id/edit',
  ADMIN_BANNERS: ROOT_ROUTES.ADMIN + '/banners',
  ADMIN_BANNERS_ADD: ROOT_ROUTES.ADMIN + '/banners/add',
  ADMIN_BANNERS_EDIT: ROOT_ROUTES.ADMIN + '/banners/:id/edit',
  ADMIN_NOTIFICATIONS: ROOT_ROUTES.ADMIN + '/notifications',
  ADMIN_NOTIFICATIONS_SEND: ROOT_ROUTES.ADMIN + '/notifications/send',

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
  RESET_PASSWORD: 'Reset Password', // NOSONAR - This is the standard title for this page
  CHANGE_PASSWORD: 'Change Password', // NOSONAR - This is the standard title for this page

  // Static Pages
  ABOUT: 'About',
  ROADMAP: 'Roadmap',
  CONTACT: 'Contact us',
  TERMS_OF_USE: 'Terms of Use',
  CREDITS: 'Credits',
  PRIVACY_POLICY: 'Privacy Policy',
  ABOUT_DEVELOPERS: 'Developers',
  ABOUT_DEVELOPER_DETAIL: 'Developer Profile',
  ABOUT_VOLUNTEERS: 'Volunteers',
  ABOUT_VOLUNTEER_DETAIL: 'Volunteer Profile',
  ABOUT_SUPPORTERS: 'Supporters',

  // STO App Routes
  STO_DASHBOARD: 'Dashboard',
  STO_DASHBOARD_PROFILE: 'Profile',
  STO_DASHBOARD_ACCOUNTS: 'Your Accounts',
  STO_ACCOUNT_ADD: 'Add Account',
  STO_ACCOUNT_EDIT: 'Edit Account',
  STO_ACCOUNT_DETAIL: 'Account Details',
  STO_ACCOUNT_ENDEAVOURS: 'Endeavour Perks',
  STO_CHARACTER_DETAIL: 'Character Details',
  STO_CHARACTER_ADD: 'Add Character',
  STO_CHARACTER_EDIT: 'Edit Character',
  STO_DASHBOARD_STATS: 'Stats',
  STO_DASHBOARD_STATS_DETAIL: 'Stat Detail',

  // News
  NEWS: 'News',
  NEWS_DETAIL: 'News',

  // Notifications
  NOTIFICATIONS: 'Notifications',

  // Admin
  ADMIN: 'Admin',
  ADMIN_NEWS: 'Manage News',
  ADMIN_NEWS_ADD: 'New Post',
  ADMIN_NEWS_EDIT: 'Edit Post',
  ADMIN_BANNERS: 'Manage Banners',
  ADMIN_BANNERS_ADD: 'New Banner',
  ADMIN_BANNERS_EDIT: 'Edit Banner',
  ADMIN_NOTIFICATIONS: 'Sent Notifications',
  ADMIN_NOTIFICATIONS_SEND: 'Send Notification',

  // Error Pages
  SERVICE_INTERRUPTION: 'Service Interruption',
};
