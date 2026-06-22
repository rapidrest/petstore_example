///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import Pet from "../models/Pet.js";
import { ModelRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";

export async function createPetRouter(passportInstance: any, _config: any, objectFactory: ObjectFactory): Promise<Router> {
    const router = Router();
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    class PetRoute extends ModelRoute<Pet> {
        get modelClass(): any {
            return Pet;
        }
        protected repoUtilsClass: any = RepoUtils<Pet>;
    }
    const modelRoute: PetRoute = await objectFactory.newInstance(PetRoute, { name: "default" });

    /** HEAD / — return count in Content-Length */
    router.head("/", async (req, res, next) => {
        try {
            await modelRoute.doCount({ query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.end();
        } catch (err) { next(err); }
    });

    /** POST / — create one or many pets */
    router.post("/", jwtAuth, async (req, res, next) => {
        try {
            await modelRoute.doValidate(req.body, { user: req.user as any });
            const result = await modelRoute.doCreate(req.body, { req: req as any, res: res as any, user: req.user as any });
            res.status(201).json(result);
        } catch (err) { next(err); }
    });

    /** GET / — find all pets */
    router.get("/", async (req, res, next) => {
        try {
            const result = await modelRoute.doFindAll({ query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** GET /:id — find pet by uid */
    router.get("/:id", async (req, res, next) => {
        try {
            const result = await modelRoute.doFindById(req.params.id, { query: req.query, req: req as any, res: res as any, user: req.user as any });
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res, next) => {
        try {
            const result = await modelRoute.doUpdate(req.params.id, req.body, { req: req as any, res: res as any, user: req.user as any });
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

    /** DELETE / — truncate all pets */
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
