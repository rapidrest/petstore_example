#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import http from "http";
import winston from "winston";
import config from "./config.js";
import { createDataSource } from "./data-source.js";
import { createApp } from "./app.js";

const logLevel: string = config.get("logger:level") || (process.env.environment === "production" ? "info" : "debug");
const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
    transports: [new winston.transports.Console()],
});

const port = config.get("port") || 3000;
let server: http.Server | undefined;

const start = async (): Promise<void> => {
    const dataSource = createDataSource(config);
    await dataSource.initialize();
    logger.info("Database connected");

    const app = createApp(config, dataSource);
    server = app.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
    });

    process.on("SIGINT", async () => {
        logger.info("Shutting down...");
        server?.close();
        await dataSource.destroy();
        process.exit(0);
    });
};

void start();
