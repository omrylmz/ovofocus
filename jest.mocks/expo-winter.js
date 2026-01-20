// Mock for expo/src/winter/* modules
// These modules cause issues in Jest test environment

module.exports = {
  getValue: jest.fn(),
  structuredClone: (obj) => JSON.parse(JSON.stringify(obj)),
};
