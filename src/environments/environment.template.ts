import packageJson from '../../package.json';
import { Environment } from './models/environment.model';

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
};
