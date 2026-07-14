///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import jwt from "jsonwebtoken";
import User, { UserStatus } from "../models/User.js";
import { ObjectFactory, RepoUtils } from "@rapidrest/service-core";

export async function createAuthRouter(passportInstance: any, config: any, objectFactory: ObjectFactory): Promise<Router> {
    const router = Router();
    const userRepo: RepoUtils<User> = await objectFactory.newInstance(RepoUtils, { name: User.name, initialize: true, args: [User] });
    const jwtConfig = config.get("auth");

    const basicAuth = passportInstance.authenticate("basic", { session: false });
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });

    /**
     * GET /user/login
     * Authenticates via HTTP Basic and returns a JWT token.
     */
    router.get("/login", basicAuth, async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).end();
            }

            let user = await userRepo.findOne((req.user as any).uid, { ignoreACL: true });
            if (!user) {
                return res.status(401).end();
            }

            user = await userRepo.update({
                uid: user.uid,
                version: user.version,
                userStatus: UserStatus.ONLINE,
                dateModified: new Date(),
            }, user, {
                ignoreACL: true,
                user
            });

            const payload = { uid: user.uid, name: user.name, email: user.email, roles: user.roles };
            const token = jwt.sign(payload, jwtConfig.secret, {
                expiresIn: jwtConfig.options?.expiresIn ?? "1h",
                audience: jwtConfig.options?.audience,
                issuer: jwtConfig.options?.issuer,
            });

            return res.json({ token });
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /**
     * GET /user/logout
     * Marks the authenticated user as OFFLINE.
     */
    router.get("/logout", jwtAuth, async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).end();
            }

            let user = await userRepo.findOne((req.user as any).uid, { user: req.user as any });
            if (!user) {
                return res.status(401).end();
            }

            user = await userRepo.update({
                uid: user.uid,
                version: user.version,
                userStatus: UserStatus.OFFLINE,
                dateModified: new Date(),
            }, user, {
                ignoreACL: true,
                user
            });

            return res.sendStatus(204);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    return router;
}
