///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { NextRequest } from "next/server";
import { ObjectFactory } from "@rapidrest/service-core";

// Mirrors the response shape returned by Fastify's app.inject() so test
// assertions don't need to change.
export interface TestResponse {
    statusCode: number;
    headers: Record<string, string>;
    json(): any;
    text(): string;
}

export interface InjectOptions {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    // Fastify called this "payload"; we accept that name for compatibility.
    payload?: any;
    // Dynamic route params (e.g. { id: "abc" }) for [id] route segments.
    params?: Record<string, string>;
}

type RouteHandler = (req: NextRequest, ctx?: any) => Promise<Response>;

/**
 * Calls a Next.js App Router handler directly and returns a Fastify-compatible
 * response object so existing test assertions work without change.
 */
export async function inject(handler: RouteHandler, opts: InjectOptions): Promise<TestResponse> {
    const fullUrl = `http://localhost${opts.url}`;
    const headers = new Headers(opts.headers ?? {});
    let body: string | undefined;
    if (opts.payload !== undefined) {
        body = JSON.stringify(opts.payload);
        if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }
    }

    const req = new NextRequest(fullUrl, { method: opts.method ?? "GET", headers, body });
    const ctx = opts.params ? { params: Promise.resolve(opts.params) } : undefined;
    const response = await handler(req, ctx);

    // Pre-read body once so .json() can be synchronous (matching Fastify behaviour).
    const bodyText = await response.text().catch(() => "");
    const headersMap: Record<string, string> = {};
    response.headers.forEach((value, key) => { headersMap[key] = value; });

    return {
        statusCode: response.status,
        headers: headersMap,
        json() { return bodyText ? JSON.parse(bodyText) : undefined; },
        text() { return bodyText; },
    };
}

/**
 * Pre-populates globalThis so route helpers (startup.ts / *RouteHelper.ts)
 * reuse the test-owned ObjectFactory instead of creating a new one.
 * Call this after initDatabase() succeeds.
 */
export function setupGlobals(objectFactory: ObjectFactory, logger: any) {
    const g = globalThis as any;
    g._logger = logger;
    g._objectFactory = objectFactory;
    g._appInitialized = true;
    // Reset cached model-route singletons so they bind to the new factory.
    g._userCRUDRoute = undefined;
    g._petCRUDRoute = undefined;
    g._orderCRUDRoute = undefined;
}

export function teardownGlobals() {
    const g = globalThis as any;
    g._appInitialized = false;
    g._objectFactory = undefined;
    g._logger = undefined;
    g._userCRUDRoute = undefined;
    g._petCRUDRoute = undefined;
    g._orderCRUDRoute = undefined;
}
