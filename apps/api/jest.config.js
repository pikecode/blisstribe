const path = require('path');

module.exports = {
  displayName: 'api',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  rootDir: path.join(__dirname, '../..'),
  testMatch: ['**/tests/shop/**/*.spec.(ts|js)'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2021',
        lib: ['ES2021'],
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        declaration: true,
        strict: true,
        skipLibCheck: true,
        types: ['jest', 'node'],
        baseUrl: path.join(__dirname, '../..'),
        paths: {
          '@/*': ['apps/api/src/*'],
        },
      },
    }],
  },
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/api',
};
