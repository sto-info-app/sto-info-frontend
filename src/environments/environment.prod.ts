import packageJson from '../../package.json';

export const environment = {
  production: true,
  version: packageJson.version,
  env_name: 'prod',
  env_label: 'Production',
  apiUrl: 'https://api.startrekonline.info',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
  allowDebugging: false,
  minsBeforeLogoutExpiryToShowWarning: 5,
  minsBeforeLogoutExpiryToRefreshToken: 15,
};
