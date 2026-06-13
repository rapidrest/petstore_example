///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import { hash as argonHash } from "argon2";
import { DataSource } from "typeorm";
import User from "../models/User.js";

export function createUserRouter(passportInstance: any, config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(User);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    const trustedRoles: string[] = config.get("trusted_roles") || ["admin"];

    const isAdmin = (jwtUser: any): boolean =>
        Array.isArray(jwtUser?.roles) && jwtUser.roles.some((r: string) => trustedRoles.includes(r));

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
        } catch (err) {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET / — find all users */
    router.get("/", jwtAuth, async (_req, res) => {
        try {
            const users = await repo.find();
            return res.json(users);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET /:id — find user by uid */
    router.get("/:id", jwtAuth, async (req, res) => {
        try {
            const user = await repo.findOne({ where: { uid: req.params.id } as any });
            if (!user) return res.status(404).json({ message: "User not found" });
            return res.json(user);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res) => {
        try {
            const id = req.params.id;
            const jwtUser = req.user as any;

            if (!isAdmin(jwtUser) && id !== jwtUser.uid) {
                return res.status(403).json({ message: "Permission denied" });
            }

            const existing = await repo.findOne({ where: { uid: id } as any });
            if (!existing) return res.status(404).json({ message: "User not found" });

            const { _id, ...updates } = req.body;
            if (updates.password) updates.password = await argonHash(updates.password);

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
            const jwtUser = req.user as any;

            if (!isAdmin(jwtUser) && id !== jwtUser.uid) {
                return res.status(403).json({ message: "Permission denied" });
            }

            const existing = await repo.findOne({ where: { uid: id } as any });
            if (!existing) return res.status(404).json({ message: "User not found" });

            const value = req.body;
            (existing as any)[property] = value;
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
            const existing = await repo.findOne({ where: { uid: req.params.id } as any });
            if (!existing) return res.status(404).json({ message: "User not found" });
            await repo.deleteOne({ uid: req.params.id });
            return res.status(204).end();
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** DELETE / — truncate all users */
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
