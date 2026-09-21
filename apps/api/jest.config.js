const path = require('path');

module.exports = {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: path.join(__dirname, '../..'),
  testMatch: ['**/tests/shop/**/*.spec.ts'],
  moduleNameMapper: {
    '^@nestjs/(.*)$': '<rootDir>/node_modules/@nestjs/$1',
    '^@prisma/(.*)$': '<rootDir>/node_modules/@prisma/$1',
    '^src/(.*)$': '<rootDir>/apps/api/src/$1',
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2020',
          target: 'ES2021',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          baseUrl: path.join(__dirname, './'),
          paths: {
            '@/*': ['src/*'],
          },
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/api',
};
