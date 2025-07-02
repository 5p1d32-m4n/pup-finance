import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Automatically clear mock calls and instances between every test:
    clearMocks: true,
    // This is the directory where Jest should output its coverage files
    coverageDirectory: 'coverage',
    // A list of the paths to directories that Jest should use to search for files in.
    roots: ['<rootDir>/src'],
    // The test match pattern
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    moduleNameMapper:{
        // This line is the crucial part.
    // It tells Jest to map any import starting with '@/'
    // to the '<rootDir>/src/' directory.
    '^@/(.*)$': '<rootDir>/src/$1',
    }
}

export default config;