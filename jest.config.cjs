const { createCjsPreset } = require('jest-preset-angular/presets');

const cjsPreset = createCjsPreset();

const tsTransformKey = Object.keys(cjsPreset.transform || {}).find(key => {
  const transformEntry = cjsPreset.transform[key];
  return (
    Array.isArray(transformEntry) && transformEntry[0] === 'jest-preset-angular'
  );
});

const transform = {
  ...cjsPreset.transform,
  ...(tsTransformKey
    ? {
        [tsTransformKey]: [
          cjsPreset.transform[tsTransformKey][0],
          {
            ...cjsPreset.transform[tsTransformKey][1],
            tsconfig: '<rootDir>/tsconfig.jest.json',
          },
        ],
      }
    : {}),
};

const presetModuleNameMapper = cjsPreset.moduleNameMapper || {};

module.exports = {
  ...cjsPreset,

  transform,

  reporters: ['default', 'jest-junit'],

  // Align with backend Jest settings where possible
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],

  testRegex: String.raw`(?<!\.fuzz)\.spec\.ts$`,
  testPathIgnorePatterns: ['/node_modules/', '/.stryker-tmp/'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    ...presetModuleNameMapper,
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: true,
  coverageReporters: [
    'text-summary',
    'text',
    'lcov',
    'cobertura',
    'json-summary',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',

    // Tests
    '!src/**/*.spec.ts',
    '!src/**/*.fuzz.spec.ts',
    '!src/**/*.module.ts',
    '!**/.stryker-tmp/**',

    // Angular bootstrap / wiring
    '!src/main.ts',
    '!src/**/*.template.ts',
    '!src/**/polyfills.{ts,js}', // FE only

    // Typings
    '!src/**/*.d.ts',
    '!src/**/*.model.ts',
    '!src/**/*.models.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.interfaces.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.constants.ts',

    '!src/**/index.{ts,js}', // barrel exports

    // Environments
    '!src/environments/**', // FE env files

    // Build files
    '!src/**/generated/**', // if you have any
    '!src/**/migrations/**', // if applicable
    '!src/environments/inject-env-vars.js', // Build script
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/reports/',
    '/src/environments/',
    '/src/main.ts',
    '/src/polyfills.ts',
    '/.stryker-tmp/',
  ],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 99,
      functions: 99,
      lines: 99,
    },
  },
  coverageDirectory: '<rootDir>/reports/coverage',
};
