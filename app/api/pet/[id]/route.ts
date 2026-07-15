///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getPetCRUDRoute } from "@/src/routes/petRouteHelper";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /pet/:id — find pet by uid (public)
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const modelRoute = await getPetCRUDRoute();
        const result = await modelRoute.findById(id, queryFromUrl(request), undefined);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// PUT /pet/:id — update pet by uid (requires JWT)
export async function PUT(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const body = await request.json();
        const modelRoute = await getPetCRUDRoute();
        const result = await modelRoute.update(id, body, request as any, auth.user);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /pet/:id — delete pet by uid (requires JWT)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const modelRoute = await getPetCRUDRoute();
        await modelRoute.delete(id, undefined, undefined, request as any, auth.user);
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 500);
    }
}
