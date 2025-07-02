module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Automatically clear mock calls and instances between every test:
    clearMocks: true,
    // This is the directory where Jest should output its coverage files
    coverageDirectory: 'coverage',
    // A list of the paths to directories that Jest should use to search for files in.
    roots: ['<rootDir>/src'],
    // The test match pattern
    testMatch: ['**/__tests__/**/*.test.ts'],
}