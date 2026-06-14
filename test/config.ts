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
    datastores: {
        mongo: {
            host: "localhost",
            port: 9999,
            database: "petstore_test",
        },
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
});

export default conf;
