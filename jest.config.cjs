const { createCjsPreset } = require('jest-preset-angular/presets');

const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,

  // Ensure the test TypeScript config is used for Jest while
  // keeping ts-jest diagnostics enabled (default behavior).
  globals: {
    ...cjsPreset.globals,
    'ts-jest': {
      ...(cjsPreset.globals && cjsPreset.globals['ts-jest']),
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },

  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: false,
};
