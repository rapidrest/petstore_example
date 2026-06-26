///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { createRequire } from "module";
import nconf from "nconf";

const _require = createRequire(import.meta.url);
const packageInfo = _require("../package.json");

const conf = nconf.argv().env({
    separator: "__",
    parseValues: true,
});

conf.defaults({
    service_name: packageInfo.name,
    version: packageInfo.version,
    cors: {
        origin: ["http://localhost:3000"],
    },
    trusted_roles: ["admin"],
    auth: {
        secret: "MyPasswordIsSecure",
        options: {
            expiresIn: "1 hour",
            audience: "company.local",
            issuer: "api.company.local",
        },
    },
    rbac: {
        enabled: true,
    },
    metrics: {
        authRequired: false,
    },
    session: {
        secret: "SESSION_SECRET",
    },
});

// Use nconf.set() (memory store, highest priority below argv/env) so these
// values are never overridden by src/config.ts defaults — which are loaded
// transitively when tests import the Next.js route files.
// Use host+port+database format: the ConnectionManager prefers it over url.
conf.set("datastores", {
    acl: {
        type: "mongodb",
        url: "mongodb://localhost:9999/acls",
        synchronize: true,
    },
    mongo: {
        type: "mongodb",
        url: "mongodb://localhost:9999/petstore_test",
    },
});

export default conf;
