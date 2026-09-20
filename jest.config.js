module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  testTimeout: 15000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/database/seed.js'],
};
