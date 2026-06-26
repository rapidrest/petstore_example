///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { getApp } from "@/src/lib/startup";
import { NextRequest, NextResponse } from "next/server";
import { verify } from "argon2";
import User, { UserStatus } from "@/src/models/User";
import { RepoUtils } from "@rapidrest/service-core";
import { JWTUtils } from "@rapidrest/core";

async function extractBasicUser(request: NextRequest, userRepo: RepoUtils<User>): Promise<User | Response | null> {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("basic ")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const base64 = authHeader.slice(6).trim();
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    const user = await userRepo.findOne(username);
    if (!user) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }
    const valid = await verify(user.password, password);
    if (!valid) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }
    return user;
}

// GET /user/login — Basic auth → issue JWT
export async function GET(request: NextRequest) {
    const { objectFactory, config } = await getApp();
    const userRepo: RepoUtils<User> = await objectFactory.newInstance(RepoUtils, {
        name: User.name,
        initialize: true,
        args: [User],
    });

    const result = await extractBasicUser(request, userRepo);
    if (result instanceof Response) return result;
    if (!result) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let user = result;
    user = await userRepo.update(
        { uid: user.uid, version: user.version, userStatus: UserStatus.ONLINE, dateModified: new Date() },
        user,
        { ignoreACL: true, user }
    );

    const token = await JWTUtils.createToken(config.get("auth"), user);
    return NextResponse.json({ token });
}
