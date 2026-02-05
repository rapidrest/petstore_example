/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
import type { Config } from 'jest';

const config: Config = {
    verbose: true,
    transform: {
        "^.+\\.(ts|tsx)?$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.test.json",
                diagnostics: {
                    ignoreCodes: [
                        2321
                    ]
                }
            }
        ]
    },
    testEnvironment: "node",
    testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "json"
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/test/"
    ],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        }
    },
    collectCoverageFrom: [
        "src/*.{js,ts}"
    ],
    reporters: [
        [
            "default",
            {
                summaryThreshold: 1
            }
        ]
    ]
};

export default config;