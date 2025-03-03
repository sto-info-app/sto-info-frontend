//NOTE: Add *ALL* variables to the environment model.
//NOTE: The app will throw an error if env vars missing/invalid.
//NOTE: This will assist if variables are missing upon release!

import packageJson from '../../package.json';
import { Environment } from './models/environment.model';

export const environment: Environment = {
  production: false,
  version: packageJson.version,
  env_name: 'local',
  env_label: 'Local Development',
  apiUrl: 'http://localhost:3000',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
  allowDebugging: true,
  minsBeforeLogoutExpiryToShowWarning: 5,
  minsBeforeLogoutExpiryToRefreshToken: 15,
};
