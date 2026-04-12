/**
 * Jest Configuration for Next.js Project
 * Includes setup for testing API routes and utility functions
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Mock jose library
    "^jose$": "<rootDir>/__mocks__/jose.js",
  },
  testMatch: ["**/__tests__/**/*.test.js", "**/?(*.)+(spec|test).js"],
  transformIgnorePatterns: ["node_modules/(?!(jose|uuid)/)"],
  collectCoverageFrom: [
    "app/**/*.{js,jsx}",
    "lib/**/*.{js,jsx}",
    "actions/**/*.{js,jsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
