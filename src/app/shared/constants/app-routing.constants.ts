export const ROOT_ROUTES = {
  ABOUT: 'about',
  COMMUNITY: 'community',
  DASHBOARD: 'dashboard',
  NEWS: 'news',
  ADMIN: 'admin',
  STORYTIME: 'storytime',
};

const REGISTRY_ROOT = ROOT_ROUTES.COMMUNITY + '/registry';
const REGISTRY_PROFILES = REGISTRY_ROOT + '/profiles';

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
  RESOURCES: 'resources',
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

  // Community - Galactic Personnel Registry
  COMMUNITY: ROOT_ROUTES.COMMUNITY,
  COMMUNITY_REGISTRY: REGISTRY_ROOT,
  COMMUNITY_REGISTRY_SEARCH: REGISTRY_ROOT + '/search',
  COMMUNITY_REGISTRY_RECENTLY_JOINED: REGISTRY_ROOT + '/recently-joined',
  COMMUNITY_REGISTRY_RECENTLY_ACTIVE: REGISTRY_ROOT + '/recently-active',
  COMMUNITY_REGISTRY_PROFILES: REGISTRY_PROFILES,
  COMMUNITY_REGISTRY_PROFILE: REGISTRY_PROFILES + '/:username',
  COMMUNITY_REGISTRY_ACCOUNT: REGISTRY_PROFILES + '/:username/:accountSlug',
  COMMUNITY_REGISTRY_CHARACTER:
    REGISTRY_PROFILES + '/:username/:accountSlug/:characterSlug',

  // Community - Friends and blocking (authenticated)
  COMMUNITY_FRIENDS: ROOT_ROUTES.COMMUNITY + '/friends',

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
  ADMIN_REPORTS: ROOT_ROUTES.ADMIN + '/reports',
  ADMIN_USERS: ROOT_ROUTES.ADMIN + '/users',

  // Storytime
  STORYTIME: ROOT_ROUTES.STORYTIME,
  STORYTIME_STORIES: ROOT_ROUTES.STORYTIME + '/stories',
  STORYTIME_LIBRARY: ROOT_ROUTES.STORYTIME + '/library',
  STORYTIME_ARCS: ROOT_ROUTES.STORYTIME + '/arcs',
  STORYTIME_ARC: ROOT_ROUTES.STORYTIME + '/arcs/:arcSlug',
  STORYTIME_STORY: ROOT_ROUTES.STORYTIME + '/stories/:storySlug',
  STORYTIME_MANAGE: ROOT_ROUTES.STORYTIME + '/manage/stories',
  STORYTIME_STORY_NEW: ROOT_ROUTES.STORYTIME + '/manage/stories/new',
  STORYTIME_STORY_EDIT: ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId',
  STORYTIME_CHAPTER:
    ROOT_ROUTES.STORYTIME + '/stories/:storySlug/chapters/:chapterSlug',
  STORYTIME_CHARACTER:
    ROOT_ROUTES.STORYTIME + '/stories/:storySlug/characters/:characterSlug',
  STORYTIME_MANAGE_CHARACTERS:
    ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId/characters',
  STORYTIME_CHARACTER_NEW:
    ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId/characters/new',
  STORYTIME_CHARACTER_EDIT:
    ROOT_ROUTES.STORYTIME + '/manage/characters/:characterId',
  STORYTIME_COLLABORATORS:
    ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId/collaborators',
  STORYTIME_INVITATIONS: ROOT_ROUTES.STORYTIME + '/manage/invitations',
  STORYTIME_MANAGE_CHAPTERS:
    ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId/chapters',
  STORYTIME_CHAPTER_NEW:
    ROOT_ROUTES.STORYTIME + '/manage/stories/:storyId/chapters/new',
  STORYTIME_CHAPTER_EDIT: ROOT_ROUTES.STORYTIME + '/manage/chapters/:chapterId',
  STORYTIME_MANAGE_ARCS: ROOT_ROUTES.STORYTIME + '/manage/arcs',
  STORYTIME_ARC_NEW: ROOT_ROUTES.STORYTIME + '/manage/arcs/new',
  STORYTIME_ARC_EDIT: ROOT_ROUTES.STORYTIME + '/manage/arcs/:arcId',
  STORYTIME_ARC_STORIES: ROOT_ROUTES.STORYTIME + '/manage/arcs/:arcId/stories',
  STORYTIME_ARC_COLLABORATORS:
    ROOT_ROUTES.STORYTIME + '/manage/arcs/:arcId/collaborators',
  STORYTIME_SPOTLIGHT: ROOT_ROUTES.STORYTIME + '/spotlight',
  STORYTIME_CONTENT_POLICY: ROOT_ROUTES.STORYTIME + '/content-policy',
  STORYTIME_REMOVED: ROOT_ROUTES.STORYTIME + '/removed',
  STORYTIME_MODERATION: ROOT_ROUTES.STORYTIME + '/manage/moderation',
  STORYTIME_MANAGE_SPOTLIGHT: ROOT_ROUTES.STORYTIME + '/manage/spotlight',
  STORYTIME_SPOTLIGHT_NEW: ROOT_ROUTES.STORYTIME + '/manage/spotlight/new',
  STORYTIME_SPOTLIGHT_EDIT:
    ROOT_ROUTES.STORYTIME + '/manage/spotlight/:spotlightId',

  // Error Pages
  SERVICE_INTERRUPTION: 'service-interruption',
  // Matches no route, so the wildcard renders the not-found page. Used when
  // code needs to send a visitor there deliberately.
  PAGE_NOT_FOUND: 'page-not-found',
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
  RESOURCES: 'STO Resources',
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

  // Community - Galactic Personnel Registry
  COMMUNITY: 'Community',
  COMMUNITY_REGISTRY: 'Galactic Personnel Registry',
  COMMUNITY_REGISTRY_SEARCH: 'Search the Registry',
  COMMUNITY_REGISTRY_RECENTLY_JOINED: 'Recently Joined',
  COMMUNITY_REGISTRY_RECENTLY_ACTIVE: 'Recently Active',
  COMMUNITY_REGISTRY_PROFILES: 'Profiles',
  COMMUNITY_REGISTRY_PROFILE: 'Member Profile',
  COMMUNITY_REGISTRY_ACCOUNT: 'Member Account',
  COMMUNITY_REGISTRY_CHARACTER: 'Member Captain',

  // Community - Friends and blocking (authenticated)
  COMMUNITY_FRIENDS: 'Friends',

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
  ADMIN_REPORTS: 'Reported Officers',
  ADMIN_USERS: 'Manage Members',

  // Storytime
  STORYTIME: 'Storytime',
  STORYTIME_STORIES: 'Stories',
  STORYTIME_LIBRARY: 'Your Library',
  STORYTIME_ARCS: 'Arcs',
  STORYTIME_ARC: 'Arc',
  STORYTIME_STORY: 'Story',
  STORYTIME_MANAGE: 'Your Stories',
  STORYTIME_STORY_NEW: 'Create a Story',
  STORYTIME_STORY_EDIT: 'Edit Story',
  STORYTIME_CHAPTER: 'Chapter',
  STORYTIME_CHARACTER: 'Character',
  STORYTIME_MANAGE_CHARACTERS: 'Cast',
  STORYTIME_CHARACTER_NEW: 'Add a Character',
  STORYTIME_CHARACTER_EDIT: 'Edit Character',
  STORYTIME_COLLABORATORS: 'Collaborators',
  STORYTIME_INVITATIONS: 'Invitations',
  STORYTIME_MANAGE_CHAPTERS: 'Chapters',
  STORYTIME_CHAPTER_NEW: 'Write a Chapter',
  STORYTIME_CHAPTER_EDIT: 'Edit Chapter',
  STORYTIME_MANAGE_ARCS: 'Your Arcs',
  STORYTIME_ARC_NEW: 'Create an Arc',
  STORYTIME_ARC_EDIT: 'Edit Arc',
  STORYTIME_ARC_STORIES: 'Arc Stories',
  STORYTIME_ARC_COLLABORATORS: 'Arc Collaborators',
  STORYTIME_SPOTLIGHT: 'Spotlight',
  STORYTIME_CONTENT_POLICY: 'Content Policy',
  STORYTIME_REMOVED: 'Removed',
  STORYTIME_MODERATION: 'Storytime Moderation',
  STORYTIME_MANAGE_SPOTLIGHT: 'Manage Spotlight',
  STORYTIME_SPOTLIGHT_NEW: 'Draft a Selection',
  STORYTIME_SPOTLIGHT_EDIT: 'Edit Selection',

  // Error Pages
  SERVICE_INTERRUPTION: 'Service Interruption',
};
