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

  // Align with backend Jest settings where possible
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],

  testRegex: String.raw`.*\.spec\.ts$`,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    ...presetModuleNameMapper,
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: true,
  coverageReporters: ['text-summary', 'text', 'lcov', 'cobertura'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/**/*.model.ts',
    '!src/**/*.models.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.interfaces.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.constants.ts',
    '!src/**/*.template.ts',
    '!src/**/index.{ts,js}', // barrel exports
    '!src/**/main.{ts,js}', // app bootstrap
    '!src/**/polyfills.{ts,js}', // FE only
    '!src/environment*.{ts,js}', // FE env files
    '!src/**/generated/**', // if you have any
    '!src/**/migrations/**', // if applicable
    '!src/environments/inject-env-vars.js', // Build script
    '!src/test.ts', // Legacy Karma
    '!src/test-setup.ts', // Legacy setup
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
};
