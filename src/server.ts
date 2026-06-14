#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import config from "./config.js";
import { createDataSource } from "./data-source.js";
import { createApp } from "./app.js";

const start = async () => {
    const dataSource = createDataSource(config);
    await dataSource.initialize();

    const app = await createApp(config, dataSource, { logger: true });
    const host = config.get("host") || "0.0.0.0";
    const port = config.get("port") || 3000;
    await app.listen({ host, port });
};

start().catch((err) => {
    console.error(err);
    process.exit(1);
});
