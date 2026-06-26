///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Pre-compiled native packages must stay in Node.js module resolution
    serverExternalPackages: [
        "@rapidrest/core",
        "@rapidrest/service-core",
        "argon2",
        "ioredis",
        "mongodb",
        "nconf",
        "reflect-metadata",
        "winston",
    ],
    webpack(config) {
        // Allow TypeScript source files to be imported with .js extensions
        // (ESM convention: import './foo.js' resolves to './foo.ts')
        config.resolve.extensionAlias = {
            ".js": [".ts", ".tsx", ".js", ".jsx"],
            ".mjs": [".mts", ".mjs"],
        };
        return config;
    },
};

export default nextConfig;
