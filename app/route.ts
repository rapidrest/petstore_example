///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { getApp } from "@/src/lib/startup";
import { NextResponse } from "next/server";

export async function GET() {
    const { config } = await getApp();
    return NextResponse.json({
        name: config.get("service_name"),
        time: Date.now(),
        version: config.get("version"),
    });
}
