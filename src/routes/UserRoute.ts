///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { Router } from "express";
import User from "../models/User.js";
import { ApiErrorMessages, ModelRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { ApiError, UserUtils } from "@rapidrest/core";

export async function createUserRouter(passportInstance: any, config: any, objectFactory: ObjectFactory): Promise<Router> {
    const router = Router();
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    class UserRoute extends ModelRoute<User> {
        get modelClass(): any {
            return User;
        }
        protected repoUtilsClass: any = RepoUtils<User>;
    }
    const modelRoute: UserRoute = await objectFactory.newInstance(UserRoute, { name: "default" });
    const trustedRoles: [] = config.get("trusted_roles");

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (req, res, next) => {
        try {
            await modelRoute.doCount({ query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.end();
        } catch (err) { next(err); }
    });

    /** POST / — create one or many users */
    router.post("/", async (req, res, next) => {
        try {
            await modelRoute.doValidate(req.body, { user: req.user as any });
            const obj = Array.isArray(req.body) ? req.body : [req.body];
            for (const user of obj) {
                if (user.password) {
                    user.password = await argon.hash(user.password);
                }
            }
            const result = await modelRoute.doCreate(req.body, { req: req as any, res: res as any, user: req.user as any });
            res.status(201).json(result);
        } catch (err) { next(err); }
    });

    /** GET / — find all users */
    router.get("/", jwtAuth, async (req, res, next) => {
        try {
            const result = await modelRoute.doFindAll({ query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** GET /:id — find user by uid */
    router.get("/:id", jwtAuth, async (req, res, next) => {
        try {
            const result = await modelRoute.doFindById(req.params.id, { query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res, next) => {
        try {
            const obj: any = req.body;
            await modelRoute.doValidate(obj, { user: req.user as any });

            // Only admins and the user itself can make changes
            const user = req.user as any;
            if (!UserUtils.hasRoles(req.user, trustedRoles) && (req.params.id !== user.uid || obj.uid !== user.uid)) {
                throw new ApiError(ApiErrorMessages.AUTH_PERMISSION_FAILURE, 403, ApiErrorMessages.AUTH_PERMISSION_FAILURE);
            }

            if (obj.password) {
                obj.password = await argon.hash(obj.password);
            }

            const result = await modelRoute.doUpdate(req.params.id, obj, { req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res, next) => {
        try {
            const result = await modelRoute.doUpdateProperty(req.params.id, req.params.property, req.body, { req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res, next) => {
        try {
            await modelRoute.doDelete(req.params.id, { req: req as any, res: res as any, user: req.user as any });
            res.sendStatus(200);
        } catch (err) { next(err); }
    });

    /** DELETE / — truncate all users */
    router.delete("/", jwtAuth, async (req, res, next) => {
        try {
            await modelRoute.doTruncate({
                params: req.params, query: req.query, req: req as any, res: res as any, user: req.user as any
            });
            res.sendStatus(200);
        } catch (err) { next(err); }
    });

    return router;
}
