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
    // Settings pertaining to the signing and verification of authentication tokens
    auth: {
        // The default PassportJS authentication strategy to use
        strategy: "auth.JWTStrategy",
        // The password to be used when signing and verifying authentication tokens
        secret: "MyPasswordIsSecure",
        options: {
            // "algorithm": "HS256",
            expiresIn: "1 hour",
            audience: "petstore-localdb.pando.cloud",
            issuer: "api.petstore-localdb.pando.cloud",
        },
    },
    class_loader: {
        ignore: [
            /server\..*/,
            /config\..*/
        ]
    },
    cookie_secret: "COOKIE_SECRET",
    cors: {
        origin: ["http://localhost:3000"],
    },
    datastores: {
        acl: {
            type: "mongodb",
            host: "localhost",
            database: "acls",
            synchronize: true,
        },
        // cache: {
        //     type: "redis",
        //     url: "redis://localhost",
        // },
        // events: {
        //     type: "redis",
        //     url: "redis://localhost"
        // },
        // logs: {
        //     type: "redis",
        //     url: "redis://localhost"
        // },
        mongo: {
            type: "mongodb",
            host: "localhost",
            database: "petstore_user",
        },
    },
    logger: {
        level: "info",
    },
    metrics: {
        authRequired: true,
    },
    rbac: {
        enabled: true,
    },
    session: {
        secret: "SESSION_SECRET",
    },
    // Specifies the role names that are considered to be trusted with administrative privileges.
    trusted_roles: ["admin"],
});

export default conf;
