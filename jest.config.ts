import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  testMatch: ['**/*.spec.ts'],
  testEnvironment: 'jsdom',

  // Good defaults for Angular + TS
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        stringifyContentPathRegex: String.raw`\\.(html|svg)$`,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!@angular|rxjs|jest-preset-angular)',
  ],

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: true,
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/main.ts',
    '!src/environments/**/*.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],

  // Make CI output deterministic and easier to read
  reporters: ['default'],
};

export default config;
