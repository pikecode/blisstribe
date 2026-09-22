const path = require('path');

module.exports = {
  displayName: 'api',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  rootDir: path.join(__dirname, '../..'),
  testMatch: ['**/tests/shop/**/*.spec.(ts|js)'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|@prisma|prisma|uuid|class-transformer|class-validator|type-fest)/)'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2020',
        lib: ['ES2020'],
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

