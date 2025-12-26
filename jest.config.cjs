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

  collectCoverageFrom: [
    'src/**/*.ts',
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
  ],
  coverageDirectory: '<rootDir>/coverage',
};
