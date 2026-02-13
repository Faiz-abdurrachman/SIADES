import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

export default config;
