///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import User from "../models/User.js";
import { ModelRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class UserRoute extends ModelRoute<User> {
    get modelClass(): any {
        return User;
    }
    protected repoUtilsClass: any = RepoUtils<User>;
}

const g = globalThis as any;

export async function getUserModelRoute(): Promise<UserRoute> {
    if (!g._userModelRoute) {
        const { objectFactory } = await getApp();
        g._userModelRoute = await objectFactory.newInstance(UserRoute, { name: "default" });
    }
    return g._userModelRoute;
}

export async function getTrustedRoles(): Promise<string[]> {
    const { config } = await getApp();
    return config.get("trusted_roles") || ["admin"];
}
