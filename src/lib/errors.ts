///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { NextResponse } from "next/server";

export function apiError(err: any, defaultStatus = 500): NextResponse {
    const status: number = err?.status ?? err?.statusCode ?? defaultStatus;
    const message: string = err?.message ?? "Internal Server Error";
    const body: Record<string, unknown> = { message };
    if (err?.code !== undefined) body.code = err.code;
    return NextResponse.json(body, { status });
}
