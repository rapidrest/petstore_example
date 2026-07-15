///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import User from "../models/User.js";
import { CRUDRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class UserRoute extends CRUDRoute<User> {
    get modelClass(): any {
        return User;
    }
    protected repoUtilsClass: any = RepoUtils<User>;
}

const g = globalThis as any;

export async function getUserCRUDRoute(): Promise<UserRoute> {
    if (!g._userCRUDRoute) {
        const { objectFactory } = await getApp();
        g._userCRUDRoute = await objectFactory.newInstance(UserRoute, { name: "default" });
    }
    return g._userCRUDRoute;
}

export async function getTrustedRoles(): Promise<string[]> {
    const { config } = await getApp();
    return config.get("trusted_roles") || ["admin"];
}
