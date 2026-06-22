#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import config from "./config.js";
import { createApp } from "./app.js";
import { Logger } from "@rapidrest/core";
import { ObjectFactory } from "@rapidrest/service-core";

const start = async () => {
    const logLevel: string = config.get("logger:level") || (process.env.environment === "production" ? "info" : "debug");
    const logger = Logger(logLevel, config.get("logger:file"));
    console.log("Log Level=" + logLevel);
    const objectFactory = new ObjectFactory(config, logger);
    const app = await createApp(config, objectFactory, logger, { logger: true });
    const host = config.get("host") || "0.0.0.0";
    const port = config.get("port") || 3000;
    await app.listen({ host, port });
};

start().catch((err) => {
    console.error(err);
    process.exit(1);
});
