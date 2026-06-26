///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { NextRequest, NextResponse } from "next/server";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const CORS_METHODS = "GET,HEAD,POST,PUT,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization";

export function middleware(request: NextRequest) {
    if (request.method === "OPTIONS") {
        return new NextResponse(null, {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": CORS_ORIGIN,
                "Access-Control-Allow-Methods": CORS_METHODS,
                "Access-Control-Allow-Headers": CORS_HEADERS,
            },
        });
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
    response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
    response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
    return response;
}

export const config = {
    matcher: "/:path*",
};
