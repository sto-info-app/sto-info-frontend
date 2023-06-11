import packageJson from '../../package.json';
import { Environment } from './models/environment.model';

export const environment: Environment = {
  production: false,
  version: packageJson.version,
  env_name: 'dev',
  env_label: 'Development',
  apiUrl: 'https://dev-api.startrekonline.info',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
  allowDebugging: false,
  minsBeforeLogoutExpiryToShowWarning: 5,
  minsBeforeLogoutExpiryToRefreshToken: 15,
};
