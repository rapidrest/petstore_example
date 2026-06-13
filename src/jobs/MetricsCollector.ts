///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as prom from "prom-client";

export default class MetricsCollector {
    private registry: prom.Registry;

    constructor() {
        this.registry = prom.register;
    }

    public run(): void {
        // TODO
    }

    public async start(): Promise<void> {
        // TODO
    }

    public async stop(): Promise<void> {
        // TODO
    }
}
