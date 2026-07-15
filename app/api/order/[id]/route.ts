///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getOrderCRUDRoute } from "@/src/routes/orderRouteHelper";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /store/order/:id — find order by uid (requires JWT)
export async function GET(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const modelRoute = await getOrderCRUDRoute();
        const result = await modelRoute.findById(id, queryFromUrl(request), auth.user);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// PUT /store/order/:id — update order by uid (requires JWT)
export async function PUT(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const body = await request.json();
        const modelRoute = await getOrderCRUDRoute();
        const result = await modelRoute.update(id, body, request as any, auth.user);
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /store/order/:id — delete order by uid (requires JWT)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const modelRoute = await getOrderCRUDRoute();
        await modelRoute.delete(id, undefined, undefined, request as any, auth.user);
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 500);
    }
}
