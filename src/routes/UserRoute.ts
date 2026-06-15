///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "../config.js";
import { Router } from "express";
import { hash as argonHash } from "argon2";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import User from "../models/User.js";

export function createUserRouter(passportInstance: any, config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(User);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    const trustedRoles: string[] = config.get("trusted_roles") || ["admin"];

    /** HEAD / — return count in Content-Length */
    router.head("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = ModelUtils.buildSearchQuery(User, repo, req.params, req.query);
            const count = await repo.count(query);
            res.setHeader("Content-Length", count.toString());
            res.status(200).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** POST / — create one or many users (no auth required) */
    router.post("/", async (req, res) => {
        try {
            const body = req.body;
            if (Array.isArray(body)) {
                const users = await Promise.all(
                    body.map(async (u) => {
                        const user = new User(u);
                        if (user.password) user.password = await argonHash(user.password);
                        return user;
                    })
                );
                const saved = await repo.save(users);
                return res.status(201).json(saved);
            } else {
                const user = new User(body);
                if (user.password) user.password = await argonHash(user.password);
                const saved = await repo.save(user);
                return res.status(201).json(saved);
            }
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET / — find all users */
    router.get("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const limit: number = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
            const page: number = req.query.page ? Number(req.query.page) : 0;
            const skip: number = page * limit;
            const query = ModelUtils.buildSearchQuery(User, repo, req.params, req.query);
            const users = await repo.aggregate(query).skip(skip).limit(limit).toArray();
            return res.json(users);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET /:id — find user by uid */
    router.get("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const user = await repo.findOne({ where: { uid: req.params.id } });
            if (!user) return res.status(404).json({ message: "User not found" });
            return res.json(user);
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

            const id = req.params.id;
            const existing = await repo.findOne({ where: { uid: id } });
            if (!existing) return res.status(404).json({ message: "User not found" });

            const { _id, ...updates } = req.body;
            if (updates.password) updates.password = await argonHash(updates.password);

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
            if (!existing) return res.status(404).json({ message: "User not found" });

            const value = req.body;
            (existing as any)[property] = value;
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
            if (!existing) return res.status(404).json({ message: "User not found" });
            await repo.deleteOne({ uid: req.params.id });
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** DELETE / — truncate all users */
    router.delete("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            
            const query = ModelUtils.buildSearchQuery(User, repo, req.params, req.query);
            await repo.deleteMany(query);
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    return router;
}
