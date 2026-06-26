///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////

// Runs once at server start, before any route modules are evaluated.
// Ensures reflect-metadata is available for TypeScript decorator metadata.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("reflect-metadata");
    }
}
