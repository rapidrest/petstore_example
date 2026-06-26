///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getPetModelRoute } from "@/src/routes/petRouteHelper";
import { NextRequest, NextResponse } from "next/server";

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /pet — return all pets (public)
export async function GET(request: NextRequest) {
    try {
        const modelRoute = await getPetModelRoute();
        const result = await modelRoute.doFindAll({
            query: queryFromUrl(request),
            req: request as any,
            res: {} as any,
            user: undefined,
        });
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// HEAD /pet — return count in Content-Length (public)
export async function HEAD(request: NextRequest) {
    try {
        const modelRoute = await getPetModelRoute();
        let countValue = 0;
        const fakeRes: any = {
            setHeader(name: string, value: any) {
                if (name === "content-length") countValue = Number(value);
            },
            status(_code: number) {
                return this;
            },
        };
        await modelRoute.doCount({ query: queryFromUrl(request), req: request as any, res: fakeRes, user: undefined });
        return new Response(null, { status: 200, headers: { "content-length": String(countValue) } });
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// POST /pet — create pet (requires JWT)
export async function POST(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getPetModelRoute();
        const body = await request.json();
        const result = await modelRoute.doCreate(body, { req: request as any, res: {} as any, user: auth.user });
        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /pet — truncate all pets (requires JWT)
export async function DELETE(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getPetModelRoute();
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
