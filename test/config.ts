///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { createRequire } from "module";
import nconf from "nconf";

const _require = createRequire(import.meta.url);
const packageInfo = _require("../package.json");

const conf = nconf
    .argv()
    .env({
        separator: "__",
        parseValues: true,
    });

conf.defaults({
    service_name: packageInfo.name,
    version: packageInfo.version,
    cookieSecret: "COOKIE_SECRET",
    cors: {
        origin: ["http://localhost:3000"],
    },
    datastores: {
        acl: {
            type: "mongodb",
            host: "localhost",
            port: 9999,
            database: "acls",
            synchronize: true,
        },
        events: {
            type: "redis",
            url: "redis://localhost"
        },
        mongo: {
            type: "mongodb",
            host: "localhost",
            port: 9999,
            database: "petstore_user",
        },
    },
    // Specifies the role names that are considered to be trusted with administrative privileges.
    trusted_roles: ["admin"],
    // Settings pertaining to the signing and verification of authentication tokens
    auth: {
        // The default PassportJS authentication strategy to use
        strategy: "auth.JWTStrategy",
        // The password to be used when signing and verifying authentication tokens
        secret: "MyPasswordIsSecure",
        options: {
            // "algorithm": "HS256",
            expiresIn: "1 hour",
            audience: "company.local",
            issuer: "api.company.local",
        },
    },
    metrics: {
        authRequired: false,
    },
    // TODO Remove 'scripts'
    scripts: {
        ignore: [
            /server\..*/,
            /config\..*/
        ]
    },
    class_loader: {
        ignore: [
            /server\..*/,
            /config\..*/
        ]
    },
    session: {
        secret: "SESSION_SECRET",
    },
});

export default conf;
