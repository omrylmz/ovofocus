// Pre-setup file that runs before jest-expo setup
// This helps ensure proper globals are in place before Expo modules load

// Set up globalThis early
if (typeof globalThis === 'undefined') {
  global.globalThis = global;
}

// Ensure window and navigator exist
if (typeof window === 'undefined') {
  global.window = global;
}
if (typeof window.navigator === 'undefined') {
  global.window.navigator = {};
}

// Set EXPO_OS environment variable for test environment
process.env.EXPO_OS = 'ios';

// Mock import.meta for ESM compatibility
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
  global.__ExpoImportMetaRegistry = new Map();
}

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock expo winter runtime to prevent import scope errors
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({
  getValue: jest.fn(),
}), { virtual: true });
