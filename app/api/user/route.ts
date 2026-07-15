///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getUserCRUDRoute } from "@/src/routes/userRouteHelper";
import * as argon from "argon2";
import { NextRequest, NextResponse } from "next/server";

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /user — return all users (requires JWT)
export async function GET(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getUserCRUDRoute();
        const result = await modelRoute.find({}, queryFromUrl(request), auth.user);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// HEAD /user — return count in Content-Length (requires JWT)
export async function HEAD(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getUserCRUDRoute();
        let countValue = 0;
        const fakeRes: any = {
            setHeader(name: string, value: any) {
                if (name === "content-length") countValue = Number(value);
            },
            status(_code: number) {
                return this;
            },
        };
        await modelRoute.count({}, queryFromUrl(request), fakeRes, auth.user);
        return new Response(null, { status: 200, headers: { "content-length": String(countValue) } });
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// POST /user — create user (no auth required)
export async function POST(request: NextRequest) {
    try {
        const modelRoute = await getUserCRUDRoute();
        const body = await request.json();
        await modelRoute.validate(body, { user: undefined });
        const obj = Array.isArray(body) ? body : [body];
        for (const user of obj) {
            if (user.password) {
                user.password = await argon.hash(user.password);
            }
        }
        const result = await modelRoute.create(body, request as any, undefined);
        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /user — truncate all users (requires JWT)
export async function DELETE(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getUserCRUDRoute();
        await modelRoute.truncate({}, queryFromUrl(request), auth.user);
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}
