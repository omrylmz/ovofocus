/** @type {import('jest').Config} */
module.exports = {
  // Use jest-expo preset for React Native testing
  preset: 'jest-expo',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/*.(test|spec).[jt]s?(x)',
  ],

  // Setup files that run before jest environment is set up
  setupFiles: ['<rootDir>/jest.presetup.js'],

  // Setup files - runs after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapper for mocking problematic modules
  moduleNameMapper: {
    // Mock expo winter runtime modules
    '^expo/src/winter/(.*)$': '<rootDir>/jest.mocks/expo-winter.js',
  },

  // Transform ignore patterns - don't transform node_modules except specific packages
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: false,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Ignore RSC tests directory (not applicable for this project)
  testPathIgnorePatterns: ['/node_modules/', '/__rsc_tests__/'],

  // Test environment
  testEnvironment: 'node',

  // Maximum workers for parallel test execution
  maxWorkers: '50%',
};
