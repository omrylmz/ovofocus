// Jest setup file for React Native / Expo testing

// Import Jest Native matchers (if available)
try {
  require('@testing-library/jest-native/extend-expect');
} catch (e) {
  // @testing-library/jest-native is deprecated, matchers are built into
  // @testing-library/react-native v12.4+
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', regionCode: 'US' }],
  locale: 'en-US',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence console.error and console.warn in tests (optional)
// Uncomment if tests are too noisy
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

// Mock timers for precise control in tests
// Note: Tests can opt-in to fake timers with jest.useFakeTimers()

// Global test timeout (10 seconds)
jest.setTimeout(10000);
