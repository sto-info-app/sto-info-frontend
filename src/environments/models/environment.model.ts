export interface Environment {
  production: boolean;
  version: string;
  env_name: string;
  env_label: string;
  apiUrl: string;
  appTitle: string;
  appLoggedInHome: string;
  allowDebugging: boolean;
  minsBeforeLogoutExpiryToShowWarning: number;
  minsBeforeLogoutExpiryToRefreshToken: number;
  cookieYesUrl: string;
  gaMeasurementId: string;
  logRocketAppId?: string;
}
