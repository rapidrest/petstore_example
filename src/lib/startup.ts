///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import config from "../config.js";
import { Logger } from "@rapidrest/core";
import { ACLUtils, ObjectFactory } from "@rapidrest/service-core";
import { initDatabase } from "../database.js";

// Persists across Next.js HMR cycles in development
const g = globalThis as any;

export async function getApp(): Promise<{ objectFactory: ObjectFactory; config: typeof config; logger: any }> {
    if (!g._appInitialized) {
        const logLevel: string = config.get("logger:level") || (process.env.NODE_ENV === "production" ? "info" : "debug");
        g._logger = Logger(logLevel, config.get("logger:file"));
        g._objectFactory = new ObjectFactory(config, g._logger);
        await initDatabase(config, g._objectFactory, g._logger);
        await g._objectFactory.newInstance(ACLUtils, { name: "default" });
        g._appInitialized = true;
    }
    return { objectFactory: g._objectFactory, config, logger: g._logger };
}
