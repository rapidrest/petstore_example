///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import { DataSource } from "typeorm";
import Order from "../models/Order.js";

export function createOrderRouter(passportInstance: any, _config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(Order);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (_req, res) => {
        try {
            const count = await repo.count();
            res.setHeader("Content-Length", count.toString());
            res.status(200).end();
        } catch {
            res.status(500).end();
        }
    });

    /** POST / — create one or many orders */
    router.post("/", jwtAuth, async (req, res) => {
        try {
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
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET / — find all orders */
    router.get("/", jwtAuth, async (_req, res) => {
        try {
            const orders = await repo.find();
            return res.json(orders);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET /:id — find order by uid */
    router.get("/:id", jwtAuth, async (req, res) => {
        try {
            const order = await repo.findOne({ where: { uid: req.params.id } });
            if (!order) return res.status(404).json({ message: "Order not found" });
            return res.json(order);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res) => {
        try {
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            const { _id, ...updates } = req.body;
            Object.assign(existing, updates);
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res) => {
        try {
            const { id, property } = req.params;
            const existing = await repo.findOne({ where: { uid: id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            (existing as any)[property] = req.body;
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res) => {
        try {
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Order not found" });
            await repo.deleteOne({ uid: req.params.id });
            return res.status(204).end();
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** DELETE / — truncate all orders */
    router.delete("/", jwtAuth, async (_req, res) => {
        try {
            await repo.deleteMany({});
            return res.status(204).end();
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    return router;
}
