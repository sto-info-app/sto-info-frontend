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

  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  moduleNameMapper: {
    ...presetModuleNameMapper,
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: false,
};
