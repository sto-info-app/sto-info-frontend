import packageJson from '../../package.json';

export const environment = {
  production: false,
  version: packageJson.version,
  env_name: 'dev',
  env_label: 'Development',
  apiUrl: 'http://localhost:3000',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
};
