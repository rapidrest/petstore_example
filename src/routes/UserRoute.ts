///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { Router } from "express";
import User from "../models/User.js";
import { ApiErrorMessages, CRUDRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { ApiError, UserUtils } from "@rapidrest/core";

export async function createUserRouter(passportInstance: any, config: any, objectFactory: ObjectFactory): Promise<Router> {
    const router = Router();
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    class UserRoute extends CRUDRoute<User> {
        get modelClass(): any {
            return User;
        }
        protected repoUtilsClass: any = RepoUtils<User>;
    }
    const crudRoute: UserRoute = await objectFactory.newInstance(UserRoute, { name: "default" });
    const trustedRoles: [] = config.get("trusted_roles");

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (req, res, next) => {
        try {
            await crudRoute.count(req.params, req.query, res as any, req.user as any);
            res.end();
        } catch (err) { next(err); }
    });

    /** POST / — create one or many users */
    router.post("/", jwtAuth, async (req, res, next) => {
        try {
            const objs = Array.isArray(req.body) ? req.body : [req.body];
            for (const obj of objs) {
                obj.password = await argon.hash(obj.password);
            }
            const result = await crudRoute.create(req.body, req as any, req.user as any);
            res.status(201).json(result);
        } catch (err) { next(err); }
    });

    /** GET / — find all users */
    router.get("/", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.find(req.params, req.query, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** GET /:id — find user by uid */
    router.get("/:id", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.findById(req.params.id, req.query, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res, next) => {
        try {
            if (req.body.password) {
                req.body.password = await argon.hash(req.body.password);
            }
            const result = await crudRoute.update(req.params.id, req.body, req as any, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res, next) => {
        try {
            if (req.params.property === "password") {
                req.body = await argon.hash(req.body);
            }
            const result = await crudRoute.updateProperty(req.params.id, req.params.property, req.body, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res, next) => {
        try {
            await crudRoute.delete(req.params.id, req.query?.version as string, req.query?.purge as string, req as any, req.user as any);
            res.sendStatus(200);
        } catch (err) { next(err); }
    });

    /** DELETE / — truncate all users */
    router.delete("/", jwtAuth, async (req, res, next) => {
        try {
            await crudRoute.truncate(req.params, req.query, req.user as any);
            res.sendStatus(200);
        } catch (err) { next(err); }
    });

    return router;
}
