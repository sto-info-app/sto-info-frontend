//NOTE: Add *ALL* variables to the environment model.
//NOTE: The app will throw an error if env vars missing/invalid.
//NOTE: This will assist if variables are missing upon release!

import packageJson from '../../package.json';
import { Environment } from './models/environment.model';

// These declarations silence type checking; build step replaces the tokens.
declare const __production__: boolean;
declare const __allowDebugging__: boolean;
declare const __minsBeforeLogoutExpiryToShowWarning__: number;
declare const __minsBeforeLogoutExpiryToRefreshToken__: number;

export const environment: Environment = {
  production: __production__,
  version: packageJson.version,
  env_name: '__env_name__',
  env_label: '__env_label__',
  apiUrl: '__apiUrl__',
  appTitle: '__appTitle__',
  appLoggedInHome: '__appLoggedInHome__',
  allowDebugging: __allowDebugging__,
  minsBeforeLogoutExpiryToShowWarning: __minsBeforeLogoutExpiryToShowWarning__,
  minsBeforeLogoutExpiryToRefreshToken:
    __minsBeforeLogoutExpiryToRefreshToken__,
  cookieYesUrl: '__cookieYesUrl__',
  gaMeasurementId: '__gaMeasurementId__',
  logRocketAppId: '__logRocketAppId__',
};
