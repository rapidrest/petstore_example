///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
const packageInfo = require("../package.json");
const conf = require("nconf")
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
        strategy: "passportjs.JWTStrategy",
        // The password to be used when signing and verifying authentication tokens
        secret: "MyPasswordIsSecure",
        options: {
            // "algorithm": "HS256",
            expiresIn: "1 hour",
            audience: "company.local",
            issuer: "api.company.local",
        },
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
