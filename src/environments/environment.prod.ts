import packageJson from '../../package.json';

export const environment = {
  production: true,
  version: packageJson.version,
  env_name: 'prod',
  env_label: 'Production',
  apiUrl: 'http://localhost:3000',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
  allowDebugging: false,
};
