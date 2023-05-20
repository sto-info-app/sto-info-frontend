import packageJson from '../../package.json';

export const environment = {
  production: false,
  version: packageJson.version,
  env_name: 'local',
  env_label: 'Local Development',
  apiUrl: 'http://localhost:3000',
  appTitle: 'Star Trek Online Info Portal',
  appLoggedInHome: '/dashboard',
};
