const { createCjsPreset } = require('jest-preset-angular/presets');

const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,

  // Use a Jest-specific tsconfig to keep Angular's bundler resolution
  // separate from the main application tsconfig while leaving ts-jest
  // diagnostics enabled.
  globals: {
    ...cjsPreset.globals,
    'ts-jest': {
      ...(cjsPreset.globals && cjsPreset.globals['ts-jest']),
      // Always compile specs with bundler-style resolution so Angular's
      // ESM exports resolve consistently on Node 20 runners.
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
