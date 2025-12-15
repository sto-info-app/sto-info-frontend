import { readFileSync, writeFileSync } from 'node:fs';

const replaceAll = (content, token, value) => content.split(token).join(value);

const booleanLiteral = (value, fallback) => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return 'true';
    }
    if (normalized === 'false' || normalized === '0') {
      return 'false';
    }
  }

  return fallback ? 'true' : 'false';
};

const numberLiteral = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(fallback);
};

const stripPlaceholderDeclarations = content =>
  content
    .split('\n')
    .filter(line => !line.trim().startsWith('declare const __'))
    .join('\n');

const environmentTemplate = readFileSync(
  'src/environments/environment.template.ts',
  'utf8',
);

const templateBody = stripPlaceholderDeclarations(environmentTemplate);

// Pull from process.env (set in Render)
let replacedContent = templateBody;
replacedContent = replaceAll(
  replacedContent,
  '__production__',
  booleanLiteral(process.env.PRODUCTION, false),
);
replacedContent = replaceAll(
  replacedContent,
  '__env_name__',
  process.env.ENV_NAME || 'dev',
);
replacedContent = replaceAll(
  replacedContent,
  '__env_label__',
  process.env.ENV_LABEL || 'Development',
);
replacedContent = replaceAll(
  replacedContent,
  '__apiUrl__',
  process.env.API_URL || 'http://localhost:3000',
);
replacedContent = replaceAll(
  replacedContent,
  '__appTitle__',
  process.env.APP_TITLE || 'Star Trek Online Info Portal',
);
replacedContent = replaceAll(
  replacedContent,
  '__appLoggedInHome__',
  process.env.APP_LOGGED_IN_HOME || '/dashboard',
);
replacedContent = replaceAll(
  replacedContent,
  '__allowDebugging__',
  booleanLiteral(process.env.ALLOW_DEBUGGING, false),
);
replacedContent = replaceAll(
  replacedContent,
  '__minsBeforeLogoutExpiryToShowWarning__',
  numberLiteral(process.env.MINS_BEFORE_LOGOUT_EXPIRY_TO_SHOW_WARNING, 5),
);
replacedContent = replaceAll(
  replacedContent,
  '__minsBeforeLogoutExpiryToRefreshToken__',
  numberLiteral(process.env.MINS_BEFORE_LOGOUT_EXPIRY_TO_REFRESH_TOKEN, 15),
);
replacedContent = replaceAll(
  replacedContent,
  '__cookieYesUrl__',
  process.env.COOKIE_YES_URL || '',
);
replacedContent = replaceAll(
  replacedContent,
  '__gaMeasurementId__',
  process.env.GA_MEASUREMENT_ID || '',
);
replacedContent = replaceAll(
  replacedContent,
  '__logRocketAppId__',
  process.env.LOG_ROCKET_APP_ID || '',
);

// Write out the final environment.ts
writeFileSync('src/environments/environment.ts', replacedContent);
console.log('Environment file generated!');
