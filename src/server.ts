#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "./config";
import { JWTUtils, EventUtils, Logger, OASUtils } from "@composer-js/core";
import { ObjectFactory, Server } from "@composer-js/service-core";

import * as fs from "fs";
import { readFile } from "fs/promises";
import * as process from "process";
import * as os from "os";

const logLevel: string = config.get("logger:level") || (process.env.environment === "production" ? "info" : "debug");
const logger = Logger(logLevel, config.get("logger:file"));
console.log("Log Level=" + logLevel);

const objectFactory = new ObjectFactory(config, logger);
let server: any = undefined;

const start = async function (config: any, logger: any) {
    // Load the release notes file
    let releaseNotes: string | undefined = undefined;
    try {
        if (fs.existsSync(`${__dirname}/../RELEASE_NOTES.rst`)) {
            releaseNotes = await readFile(`${__dirname}/../RELEASE_NOTES.rst`, { encoding: "utf-8" });
        }
    } catch (err) {
        logger.debug(err);
    }

    // Initialize EventUtils to be able to send out telemetry events
    const auth: any = config.get("auth");
    delete auth.options.expiresIn;
    const token: string = JWTUtils.createToken(auth,
        {
            uid: `${config.get("service_name")}-${os.hostname()}`,
            name: `${config.get("service_name")}-${os.hostname()}`,
            roles: config.get("trusted_roles"),
        });
    EventUtils.init(config, logger, token);

    // Create and start the server
    server = new Server(config, __dirname, logger, objectFactory);
    await server.start();
};

void start(config, logger);

process.on("SIGINT", async () => {
    logger.info("Shutting down...");
    if (server) {
        await server.stop();
    }
    if (objectFactory) {
        await objectFactory.destroy();
    }
    process.exit(0);
});
