///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { requireAuth } from "@/src/lib/auth";
import { apiError } from "@/src/lib/errors";
import { getUserModelRoute, getTrustedRoles } from "@/src/routes/userRouteHelper";
import * as argon from "argon2";
import { NextRequest, NextResponse } from "next/server";
import { ApiErrorMessages } from "@rapidrest/service-core";
import { ApiError, UserUtils } from "@rapidrest/core";

type RouteContext = { params: Promise<{ id: string }> };

function queryFromUrl(request: NextRequest): Record<string, string> {
    return Object.fromEntries(request.nextUrl.searchParams);
}

// GET /user/:id — find user by uid (requires JWT)
export async function GET(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const modelRoute = await getUserModelRoute();
        const result = await modelRoute.doFindById(id, {
            query: queryFromUrl(request),
            req: request as any,
            res: {} as any,
            user: auth.user,
        });
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// PUT /user/:id — update user by uid (requires JWT; only self or admin)
export async function PUT(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const obj: any = await request.json();
        const modelRoute = await getUserModelRoute();
        await modelRoute.doValidate(obj, { user: auth.user });

        const trustedRoles = await getTrustedRoles();
        if (!UserUtils.hasRoles(auth.user, trustedRoles) && (id !== auth.user.uid || obj.uid !== auth.user.uid)) {
            throw new ApiError(ApiErrorMessages.AUTH_PERMISSION_FAILURE, 403, ApiErrorMessages.AUTH_PERMISSION_FAILURE);
        }

        if (obj.password) {
            obj.password = await argon.hash(obj.password);
        }

        const result = await modelRoute.doUpdate(id, obj, {
            req: request as any,
            res: {} as any,
            user: auth.user,
        });
        return NextResponse.json(result);
    } catch (err: any) {
        return apiError(err, 400);
    }
}

// DELETE /user/:id — delete user by uid (requires JWT)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await params;
        const modelRoute = await getUserModelRoute();
        await modelRoute.doDelete(id, { req: request as any, res: {} as any, user: auth.user });
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return apiError(err, 500);
    }
}
