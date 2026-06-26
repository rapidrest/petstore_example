///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getOrderModelRoute } from "@/src/routes/orderRouteHelper";
import { NextRequest, NextResponse } from "next/server";

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /store/order — return all orders (requires JWT)
export async function GET(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getOrderModelRoute();
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

// HEAD /store/order — return count in Content-Length (requires JWT)
export async function HEAD(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getOrderModelRoute();
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

// POST /store/order — create order (requires JWT)
export async function POST(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getOrderModelRoute();
        const body = await request.json();
        const result = await modelRoute.doCreate(body, { req: request as any, res: {} as any, user: auth.user });
        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /store/order — truncate all orders (requires JWT)
export async function DELETE(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const modelRoute = await getOrderModelRoute();
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
