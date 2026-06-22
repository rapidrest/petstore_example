#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import http from "http";
import config from "./config.js";
import { Logger } from "@rapidrest/core";
import { ObjectFactory } from "@rapidrest/service-core";
import { createApp } from "./app.js";

const logLevel: string = config.get("logger:level") || (process.env.environment === "production" ? "info" : "debug");
const logger = Logger(logLevel, config.get("logger:file"));
console.log("Log Level=" + logLevel);

const objectFactory = new ObjectFactory(config, logger);

const port = config.get("port") || 3000;
let server: http.Server | undefined;

const start = async (): Promise<void> => {
    const app = await createApp(config, objectFactory, logger);
    server = app.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
    });

    const shutdown = async () => {
        logger.info("Shutting down...");
        server?.close();
        await objectFactory.destroy();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
};

void start();
