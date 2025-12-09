const { createCjsPreset } = require('jest-preset-angular/presets');

const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,

  // Use a Jest-specific tsconfig to avoid conflicts with the
  // Angular bundler config while keeping ts-jest diagnostics enabled.
  globals: {
    ...cjsPreset.globals,
    'ts-jest': {
      ...(cjsPreset.globals && cjsPreset.globals['ts-jest']),
      // Use a Jest-specific tsconfig with Node-style module resolution
      // so ts-jest can resolve Angular packages reliably in all environments.
      tsconfig: '<rootDir>/tsconfig.jest.json',
    },
  },

  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: false,
};
