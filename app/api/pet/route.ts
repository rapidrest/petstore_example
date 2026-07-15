///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getPetCRUDRoute } from "@/src/routes/petRouteHelper";
import { NextRequest, NextResponse } from "next/server";

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /pet — return all pets (public)
export async function GET(request: NextRequest) {
    try {
        const modelRoute = await getPetCRUDRoute();
        const result = await modelRoute.find({}, queryFromUrl(request), undefined);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 500);
    }
}

// HEAD /pet — return count in Content-Length (public)
export async function HEAD(request: NextRequest) {
    try {
        const modelRoute = await getPetCRUDRoute();
        let countValue = 0;
        const fakeRes: any = {
            setHeader(name: string, value: any) {
                if (name === "content-length") countValue = Number(value);
            },
            status(_code: number) {
                return this;
            },
        };
        await modelRoute.count({}, queryFromUrl(request), fakeRes, undefined);
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
        const modelRoute = await getPetCRUDRoute();
        const body = await request.json();
        const result = await modelRoute.create(body, request as any, auth.user);
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
        const modelRoute = await getPetCRUDRoute();
        await modelRoute.truncate({}, queryFromUrl(request), auth.user);
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 400);
    }
}
