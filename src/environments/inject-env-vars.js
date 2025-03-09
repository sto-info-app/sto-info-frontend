const fs = require('fs');

const environmentTemplate = fs.readFileSync(
  'src/environments/environment.template.ts',
  'utf8',
);

// Pull from process.env (set in Render)
const replacedContent = environmentTemplate
  .replace('__production__', process.env.PRODUCTION || false)
  .replace('__env_name__', process.env.ENV_NAME || 'dev')
  .replace('__env_label__', process.env.ENV_LABEL || 'Development')
  .replace('__apiUrl__', process.env.API_URL || 'http://localhost:3000')
  .replace(
    '__appTitle__',
    process.env.APP_TITLE || 'Star Trek Online Info Portal',
  )
  .replace(
    '__appLoggedInHome__',
    process.env.APP_LOGGED_IN_HOME || '/dashboard',
  )
  .replace('__allowDebugging__', process.env.ALLOW_DEBUGGING || false)
  .replace(
    '__minsBeforeLogoutExpiryToShowWarning__',
    process.env.MINS_BEFORE_LOGOUT_EXPIRY_TO_SHOW_WARNING || 5,
  )
  .replace(
    '__minsBeforeLogoutExpiryToRefreshToken__',
    process.env.MINS_BEFORE_LOGOUT_EXPIRY_TO_REFRESH_TOKEN || 15,
  )
  .replace('__cookieYesUrl__', process.env.COOKIE_YES_URL || '')
  .replace('__gaMeasurementId__', process.env.GA_MEASUREMENT_ID || '');

// Write out the final environment.ts
fs.writeFileSync('src/environments/environment.ts', replacedContent);
console.log('Environment file generated!');
