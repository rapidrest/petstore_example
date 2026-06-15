///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "../config.js";
import { Router } from "express";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import Order from "../models/Order.js";

export function createOrderRouter(passportInstance: any, _config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(Order);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    const trustedRoles: string[] = config.get("trusted_roles") || ["admin"];

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = ModelUtils.buildSearchQuery(Order, repo, req.params, req.query);
            const count = await repo.count(query);
            res.setHeader("Content-Length", count.toString());
            res.status(200).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** POST / — create one or many orders */
    router.post("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const body = req.body;
            if (Array.isArray(body)) {
                const orders = body.map((o) => new Order(o));
                const saved = await repo.save(orders);
                return res.status(201).json(saved);
            } else {
                const order = new Order(body);
                const saved = await repo.save(order);
                return res.status(201).json(saved);
            }
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET / — find all orders */
    router.get("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = ModelUtils.buildSearchQuery(Order, repo, req.params, req.query);
            const orders = await repo.find(query);
            return res.json(orders);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET /:id — find order by uid */
    router.get("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const order = await repo.findOne({ where: { uid: req.params.id } });
            if (!order) return res.status(404).json({ message: "Order not found" });
            return res.json(order);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            const { _id, ...updates } = req.body;
            Object.assign(existing, updates);
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const { id, property } = req.params;
            const existing = await repo.findOne({ where: { uid: id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            (existing as any)[property] = req.body;
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            await repo.deleteOne({ uid: req.params.id });
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** DELETE / — truncate all orders */
    router.delete("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = ModelUtils.buildSearchQuery(Order, repo, req.params, req.query);
            await repo.deleteMany(query);
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    return router;
}
