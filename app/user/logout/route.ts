///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { getApp } from "@/src/lib/startup";
import { requireAuth } from "@/src/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import User, { UserStatus } from "@/src/models/User";
import { RepoUtils } from "@rapidrest/service-core";

// GET /user/logout — JWT → set OFFLINE
export async function GET(request: NextRequest) {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    const { objectFactory } = await getApp();
    const userRepo: RepoUtils<User> = await objectFactory.newInstance(RepoUtils, {
        name: User.name,
        initialize: true,
        args: [User],
    });

    const user = await userRepo.findOne(auth.user.uid);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    await userRepo.update(
        { uid: user.uid, version: user.version, userStatus: UserStatus.OFFLINE, dateModified: new Date() },
        user,
        { ignoreACL: true, user }
    );
    return new Response(null, { status: 204 });
}
