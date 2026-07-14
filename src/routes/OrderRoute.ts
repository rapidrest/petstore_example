///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import Order from "../models/Order.js";
import { CRUDRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";

export async function createOrderRouter(passportInstance: any, _config: any, objectFactory: ObjectFactory): Promise<Router> {
    const router = Router();
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    class OrderRoute extends CRUDRoute<Order> {
        get modelClass(): any {
            return Order;
        }
        protected repoUtilsClass: any = RepoUtils<Order>;
    }
    const crudRoute: OrderRoute = await objectFactory.newInstance(OrderRoute, { name: "default" });

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (req, res, next) => {
        try {
            await crudRoute.count(req.params, req.query, res as any, req.user as any);
            res.end();
        } catch (err) { next(err); }
    });

    /** POST / — create one or many orders */
    router.post("/", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.create(req.body, req as any, req.user as any);
            res.status(201).json(result);
        } catch (err) { next(err); }
    });

    /** GET / — find all orders */
    router.get("/", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.find(req.params, req.query, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** GET /:id — find order by uid */
    router.get("/:id", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.findById(req.params.id, req.query, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res, next) => {
        try {
            const result = await crudRoute.update(req.params.id, req.body, req as any, req.user as any);
            res.json(result);
        } catch (err) { next(err); }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res, next) => {
        try {
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

    /** DELETE / — truncate all orders */
    router.delete("/", jwtAuth, async (req, res, next) => {
        try {
            await crudRoute.truncate(req.params, req.query, req.user as any);
            res.sendStatus(200);
        } catch (err) { next(err); }
    });

    return router;
}
