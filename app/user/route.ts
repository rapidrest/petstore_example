///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getUserModelRoute } from "@/src/routes/userRouteHelper";
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
        const modelRoute = await getUserModelRoute();
        const result = await modelRoute.doFindAll({
            query: queryFromUrl(request),
            req: request as any,
            res: {} as any,
            user: auth.user,
        });
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
        const modelRoute = await getUserModelRoute();
        let countValue = 0;
        const fakeRes: any = {
            setHeader(name: string, value: any) {
                if (name === "content-length") countValue = Number(value);
            },
            status(_code: number) {
                return this;
            },
        };
        await modelRoute.doCount({ query: queryFromUrl(request), req: request as any, res: fakeRes, user: auth.user });
        return new Response(null, { status: 200, headers: { "content-length": String(countValue) } });
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// POST /user — create user (no auth required)
export async function POST(request: NextRequest) {
    try {
        const modelRoute = await getUserModelRoute();
        const body = await request.json();
        await modelRoute.doValidate(body, { user: undefined });
        const obj = Array.isArray(body) ? body : [body];
        for (const user of obj) {
            if (user.password) {
                user.password = await argon.hash(user.password);
            }
        }
        const result = await modelRoute.doCreate(body, { req: request as any, res: {} as any, user: undefined });
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
        const modelRoute = await getUserModelRoute();
        await modelRoute.doTruncate({
            params: {},
            query: queryFromUrl(request),
            req: request as any,
            res: {} as any,
            user: auth.user,
        });
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}
